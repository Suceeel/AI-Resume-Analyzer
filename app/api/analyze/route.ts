import { NextRequest, NextResponse } from "next/server";
import { extractText } from "unpdf";
import { analyzeResume } from "@/lib/analyzer";

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

// Free Gemini models in order of preference (most capable → most available)
const FREE_MODELS = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-1.5-flash-8b",
];

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

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  for (const model of FREE_MODELS) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1000,
            responseMimeType: "application/json",
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text: string = (data?.candidates?.[0]?.content?.parts ?? [])
          .map((p: { text?: string }) => p.text ?? "")
          .join("")
          .trim();
        if (text) {
          console.log(`✅ Gemini model succeeded: ${model}`);
          return text;
        }
      }

      const status = res.status;
      console.warn(`⚠️ Model ${model} returned ${status}, trying next...`);

      // Don't retry on auth errors
      if (status === 400 || status === 401 || status === 403) {
        throw new Error(`Auth error ${status} — check your GEMINI_API_KEY`);
      }

      // Add a small delay between retries for 429/503
      if (status === 429 || status === 503) {
        await new Promise((r) => setTimeout(r, 800));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Auth error")) throw err;
      console.warn(`⚠️ Model ${model} threw: ${msg}`);
    }
  }
  throw new Error("All Gemini models unavailable");
}

function tryParseJSON(raw: string): Record<string, unknown> | null {
  let clean = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```[\s\S]*$/i, "")
    .trim();

  try { return JSON.parse(clean); } catch {}

  const firstBrace = clean.indexOf("{");
  const lastBrace = clean.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try { return JSON.parse(clean.slice(firstBrace, lastBrace + 1)); } catch {}
  }

  if (firstBrace !== -1) {
    let partial = clean.slice(firstBrace);
    let openBraces = 0, openBrackets = 0;
    for (const ch of partial) {
      if (ch === "{") openBraces++;
      else if (ch === "}") openBraces--;
      else if (ch === "[") openBrackets++;
      else if (ch === "]") openBrackets--;
    }
    if (openBrackets > 0) partial += "]".repeat(openBrackets);
    if (openBraces > 0) partial += "}".repeat(openBraces);
    try { return JSON.parse(partial); } catch {}

    const lastComma = partial.lastIndexOf(",");
    if (lastComma !== -1) {
      let trimmed = partial.slice(0, lastComma);
      openBraces = 0; openBrackets = 0;
      for (const ch of trimmed) {
        if (ch === "{") openBraces++;
        else if (ch === "}") openBraces--;
        else if (ch === "[") openBrackets++;
        else if (ch === "]") openBrackets--;
      }
      if (openBrackets > 0) trimmed += "]".repeat(openBrackets);
      if (openBraces > 0) trimmed += "}".repeat(openBraces);
      try { return JSON.parse(trimmed); } catch {}
    }
  }
  return null;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(val)));
}
function arr(val: unknown): string[] {
  return Array.isArray(val) ? (val as string[]) : [];
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

    // No API key → use local analyzer directly
    if (!apiKey) {
      console.log("No GEMINI_API_KEY — using local analyzer");
      const localResult = analyzeResume(text);
      return NextResponse.json({ success: true, data: localResult, fallback: true });
    }

    // Try Gemini (all free models), fall back to local on failure
    let rawContent: string;
    try {
      rawContent = await callGemini(ANALYSIS_PROMPT(text.slice(0, 5000)), apiKey);
    } catch (err) {
      console.warn("All Gemini models failed, using local analyzer:", err);
      const localResult = analyzeResume(text);
      return NextResponse.json({ success: true, data: localResult, fallback: true });
    }

    const result = tryParseJSON(rawContent);
    if (!result) {
      console.warn("JSON parse failed, using local analyzer. Raw:", rawContent.slice(0, 200));
      const localResult = analyzeResume(text);
      return NextResponse.json({ success: true, data: localResult, fallback: true });
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
      fallback: false,
    };

    return NextResponse.json({ success: true, data: sanitized });
  } catch (err) {
    console.error("ANALYZE ERROR:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}