import { NextRequest, NextResponse } from "next/server";
import { extractText } from "unpdf";

export const runtime = "nodejs";
export const maxDuration = 60;

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60 * 60 * 1000;

function checkRateLimit(request: NextRequest): { allowed: boolean; resetMins: number } {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { allowed: true, resetMins: 0 };
  }
  if (entry.count >= RATE_LIMIT) {
    return { allowed: false, resetMins: Math.ceil((entry.resetAt - now) / 60000) };
  }
  entry.count += 1;
  return { allowed: true, resetMins: 0 };
}

const ANALYSIS_PROMPT = (resumeText: string) =>
  `You are an expert resume reviewer. Analyze the resume below and return ONLY a JSON object. No markdown. No code fences. No explanation. Start with { and end with }.

Resume:
"""
${resumeText}
"""

JSON structure to return:
{
  "score": <0-100>,
  "atsScore": <0-100>,
  "readabilityScore": <0-100>,
  "industry": "<string>",
  "wordCount": <number>,
  "sections": { "education": <bool>, "experience": <bool>, "skills": <bool>, "projects": <bool>, "summary": <bool> },
  "contactInfo": { "email": <bool>, "phone": <bool>, "linkedin": <bool>, "github": <bool>, "website": <bool> },
  "metrics": { "actionVerbCount": <number>, "quantifiedAchievements": <number>, "bulletPoints": <number>, "pageEstimate": <1 or 2> },
  "keywords": [<max 10 strings>],
  "missingKeywords": [<max 5 strings>],
  "duplicateWords": [<max 5 strings>],
  "weakBullets": [<max 3 strings>],
  "strengths": [<exactly 4 strings>],
  "weaknesses": [<exactly 4 strings>],
  "suggestions": [<exactly 4 strings>]
}`;

function tryParseJSON(raw: string): Record<string, unknown> | null {
  // Clean markdown fences
  let clean = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```[\s\S]*$/i, "")
    .trim();

  // Try direct parse first
  try {
    return JSON.parse(clean);
  } catch {}

  // Extract between first { and last }
  const firstBrace = clean.indexOf("{");
  const lastBrace = clean.lastIndexOf("}");

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(clean.slice(firstBrace, lastBrace + 1));
    } catch {}
  }

  // Truncated JSON — find last complete field and close the object
  if (firstBrace !== -1) {
    let partial = clean.slice(firstBrace);
    // Count open braces/brackets and close them
    let openBraces = 0;
    let openBrackets = 0;
    for (const ch of partial) {
      if (ch === "{") openBraces++;
      else if (ch === "}") openBraces--;
      else if (ch === "[") openBrackets++;
      else if (ch === "]") openBrackets--;
    }
    // Close unclosed brackets and braces
    if (openBrackets > 0) partial += "]".repeat(openBrackets);
    if (openBraces > 0) partial += "}".repeat(openBraces);
    try {
      return JSON.parse(partial);
    } catch {}
    // Last resort: truncate at last comma and close
    const lastComma = partial.lastIndexOf(",");
    if (lastComma !== -1) {
      let trimmed = partial.slice(0, lastComma);
      openBraces = 0;
      openBrackets = 0;
      for (const ch of trimmed) {
        if (ch === "{") openBraces++;
        else if (ch === "}") openBraces--;
        else if (ch === "[") openBrackets++;
        else if (ch === "]") openBrackets--;
      }
      if (openBrackets > 0) trimmed += "]".repeat(openBrackets);
      if (openBraces > 0) trimmed += "}".repeat(openBraces);
      try {
        return JSON.parse(trimmed);
      } catch {}
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const { allowed, resetMins } = checkRateLimit(request);
    if (!allowed) {
      return NextResponse.json(
        { error: `Too many requests. Try again in ${resetMins} minute${resetMins !== 1 ? "s" : ""}.` },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("resume") as File | null;

    if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });
    if (file.type !== "application/pdf") return NextResponse.json({ error: "Only PDF files are accepted." }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "File size must be under 5 MB." }, { status: 400 });

    const buffer = new Uint8Array(await file.arrayBuffer());
    const { text: pages } = await extractText(buffer, { mergePages: true });
    const text = Array.isArray(pages) ? pages.join(" ") : pages;

    if (!text || text.trim().length < 50) {
      return NextResponse.json(
        { error: "Could not extract text from this PDF. Make sure it is not a scanned image." },
        { status: 422 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Service temporarily unavailable." }, { status: 503 });
    }

    const GEMINI_URL =
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey;

    const geminiRes = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: ANALYSIS_PROMPT(text.slice(0, 5000)) }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API error:", geminiRes.status, errText);
      if (geminiRes.status === 429) {
        return NextResponse.json({ error: "AI service is busy. Please try again in a moment." }, { status: 503 });
      }
      return NextResponse.json({ error: "AI analysis failed. Please try again." }, { status: 500 });
    }

    const geminiData = await geminiRes.json();
    const parts = geminiData?.candidates?.[0]?.content?.parts ?? [];
    const rawContent: string = parts.map((p: { text?: string }) => p.text ?? "").join("").trim();

    if (!rawContent) {
      console.error("Empty Gemini response:", JSON.stringify(geminiData));
      return NextResponse.json({ error: "Empty response from AI. Please try again." }, { status: 500 });
    }

    const result = tryParseJSON(rawContent);

    if (!result) {
      console.error("All JSON parse attempts failed. Raw:", rawContent.slice(0, 300));
      return NextResponse.json({ error: "Failed to process AI response. Please try again." }, { status: 500 });
    }

    const s = (key: string) => (result.sections as Record<string, unknown>)?.[key];
    const c = (key: string) => (result.contactInfo as Record<string, unknown>)?.[key];
    const m = (key: string) => (result.metrics as Record<string, unknown>)?.[key];

    const sanitized = {
      score: clamp((result.score as number) ?? 50, 0, 100),
      atsScore: clamp((result.atsScore as number) ?? 50, 0, 100),
      readabilityScore: clamp((result.readabilityScore as number) ?? 50, 0, 100),
      industry: typeof result.industry === "string" ? result.industry : "General",
      wordCount: Number(result.wordCount) || text.trim().split(/\s+/).length,
      sections: {
        education: Boolean(s("education")),
        experience: Boolean(s("experience")),
        skills: Boolean(s("skills")),
        projects: Boolean(s("projects")),
        summary: Boolean(s("summary")),
      },
      contactInfo: {
        email: Boolean(c("email")),
        phone: Boolean(c("phone")),
        linkedin: Boolean(c("linkedin")),
        github: Boolean(c("github")),
        website: Boolean(c("website")),
      },
      metrics: {
        actionVerbCount: Number(m("actionVerbCount") ?? 0),
        quantifiedAchievements: Number(m("quantifiedAchievements") ?? 0),
        bulletPoints: Number(m("bulletPoints") ?? 0),
        pageEstimate: Number(m("pageEstimate") ?? 1),
      },
      keywords: arr(result.keywords).slice(0, 20),
      missingKeywords: arr(result.missingKeywords).slice(0, 6),
      duplicateWords: arr(result.duplicateWords).slice(0, 6),
      weakBullets: arr(result.weakBullets).slice(0, 3),
      strengths: arr(result.strengths).slice(0, 6),
      weaknesses: arr(result.weaknesses).slice(0, 5),
      suggestions: arr(result.suggestions).slice(0, 6),
    };

    return NextResponse.json({ success: true, data: sanitized });
  } catch (err) {
    console.error("ANALYZE ERROR:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(val)));
}

function arr(val: unknown): string[] {
  return Array.isArray(val) ? (val as string[]) : [];
}