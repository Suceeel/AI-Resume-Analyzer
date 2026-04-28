import { NextRequest, NextResponse } from "next/server";
import { extractText } from "unpdf";

export const runtime = "nodejs";
export const maxDuration = 60;

// ─── Rate limiting (in-memory) ───────────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 10;           // 10 requests…
const RATE_WINDOW_MS = 60 * 60 * 1000; // …per hour

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

// ─── Prompt ──────────────────────────────────────────────────────────────────
const ANALYSIS_PROMPT = (resumeText: string) => `You are an expert resume reviewer and career coach with 15+ years of experience in technical recruiting at top companies like Google, Meta, and Amazon.

Analyze this resume carefully and return a JSON object. Be specific — base EVERYTHING on the ACTUAL content. No generic advice. Reference real content from the resume.

Resume:
"""
${resumeText}
"""

Return ONLY valid JSON with no markdown, no extra text, no explanation. Just the raw JSON object:
{
  "score": <number 0-100, overall resume quality score>,
  "atsScore": <number 0-100, how well it will pass ATS systems>,
  "readabilityScore": <number 0-100, clarity and conciseness>,
  "industry": <string, detected industry e.g. "Software Engineering", "Data Science / ML", "DevOps / Cloud", "Product Management", "UX / Design", "Cybersecurity", "Finance", "Healthcare", "Marketing", "General">,
  "wordCount": <number, actual word count>,
  "sections": {
    "education": <boolean>,
    "experience": <boolean>,
    "skills": <boolean>,
    "projects": <boolean>,
    "summary": <boolean>
  },
  "contactInfo": {
    "email": <boolean>,
    "phone": <boolean>,
    "linkedin": <boolean>,
    "github": <boolean>,
    "website": <boolean>
  },
  "metrics": {
    "actionVerbCount": <number, count of strong action verbs like built, led, designed, optimized>,
    "quantifiedAchievements": <number, count of bullet points with real numbers or percentages>,
    "bulletPoints": <number, total bullet points>,
    "pageEstimate": <number, 1 or 2>
  },
  "keywords": [<strings: actual technical or domain keywords found — be thorough>],
  "missingKeywords": [<strings: 4-6 important keywords missing and relevant to this person's field>],
  "duplicateWords": [<strings: words used too many times — max 6, only real duplicates>],
  "weakBullets": [<strings: copy up to 3 actual weak or vague bullet points verbatim from the resume>],
  "strengths": [<strings: 4-6 specific strengths referencing actual content from this resume>],
  "weaknesses": [<strings: 3-5 specific weaknesses found in this actual resume>],
  "suggestions": [<strings: 5-6 specific actionable suggestions written for THIS person — not generic tips>]
}

Scoring rules:
- score: sections 35% + keywords 20% + action verbs & quantification 25% + contact info 10% + length 10%
- atsScore: penalise missing sections heavily, reward keyword density and clean structure
- readabilityScore: penalise walls of text, passive voice, missing bullets; reward concise bullets and clear sections
- Be honest — do NOT inflate scores`;

// ─── Handler ─────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    // 1. Rate limit
    const { allowed, resetMins } = checkRateLimit(request);
    if (!allowed) {
      return NextResponse.json(
        { error: `Too many requests. Try again in ${resetMins} minute${resetMins !== 1 ? "s" : ""}.` },
        { status: 429 }
      );
    }

    // 2. Validate file
    const formData = await request.formData();
    const file = formData.get("resume") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }
    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are accepted." }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be under 5 MB." }, { status: 400 });
    }

    // 3. Extract text from PDF
    const buffer = new Uint8Array(await file.arrayBuffer());
    const { text: pages } = await extractText(buffer, { mergePages: true });
    const text = Array.isArray(pages) ? pages.join(" ") : pages;

    if (!text || text.trim().length < 50) {
      return NextResponse.json(
        { error: "Could not extract text from this PDF. Make sure it is not a scanned image." },
        { status: 422 }
      );
    }

    // 4. Check API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("GEMINI_API_KEY is not set.");
      return NextResponse.json(
        { error: "Service temporarily unavailable. Please try again later." },
        { status: 503 }
      );
    }

    // 5. Call Gemini API (gemini-1.5-flash — free tier)
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: ANALYSIS_PROMPT(text.slice(0, 6000)) }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2048,
            responseMimeType: "application/json", // force JSON output
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API error:", geminiRes.status, errText);

      if (geminiRes.status === 429) {
        return NextResponse.json(
          { error: "The AI service is busy right now. Please wait a moment and try again." },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: "AI analysis failed. Please try again." },
        { status: 500 }
      );
    }

    // 6. Extract content
    const geminiData = await geminiRes.json();
    const rawContent: string = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (!rawContent) {
      console.error("Empty Gemini response:", JSON.stringify(geminiData));
      return NextResponse.json(
        { error: "Empty response from AI. Please try again." },
        { status: 500 }
      );
    }

    // 7. Parse JSON (strip markdown fences just in case)
    let result: Record<string, unknown>;
    try {
      const clean = rawContent
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
      result = JSON.parse(clean);
    } catch {
      console.error("JSON parse failed. Raw:", rawContent.slice(0, 300));
      return NextResponse.json(
        { error: "Failed to process AI response. Please try again." },
        { status: 500 }
      );
    }

    // 8. Sanitise — so the UI never crashes on missing fields
    const sanitized = {
      score:             clamp(result.score as number ?? 0, 0, 100),
      atsScore:          clamp(result.atsScore as number ?? 0, 0, 100),
      readabilityScore:  clamp(result.readabilityScore as number ?? 0, 0, 100),
      industry:          typeof result.industry === "string" ? result.industry : "General",
      wordCount:         Number(result.wordCount) || text.trim().split(/\s+/).length,
      sections: {
        education:  Boolean((result.sections as Record<string, unknown>)?.education),
        experience: Boolean((result.sections as Record<string, unknown>)?.experience),
        skills:     Boolean((result.sections as Record<string, unknown>)?.skills),
        projects:   Boolean((result.sections as Record<string, unknown>)?.projects),
        summary:    Boolean((result.sections as Record<string, unknown>)?.summary),
      },
      contactInfo: {
        email:    Boolean((result.contactInfo as Record<string, unknown>)?.email),
        phone:    Boolean((result.contactInfo as Record<string, unknown>)?.phone),
        linkedin: Boolean((result.contactInfo as Record<string, unknown>)?.linkedin),
        github:   Boolean((result.contactInfo as Record<string, unknown>)?.github),
        website:  Boolean((result.contactInfo as Record<string, unknown>)?.website),
      },
      metrics: {
        actionVerbCount:        Number((result.metrics as Record<string, unknown>)?.actionVerbCount ?? 0),
        quantifiedAchievements: Number((result.metrics as Record<string, unknown>)?.quantifiedAchievements ?? 0),
        bulletPoints:           Number((result.metrics as Record<string, unknown>)?.bulletPoints ?? 0),
        pageEstimate:           Number((result.metrics as Record<string, unknown>)?.pageEstimate ?? 1),
      },
      keywords:        arr(result.keywords).slice(0, 20),
      missingKeywords: arr(result.missingKeywords).slice(0, 6),
      duplicateWords:  arr(result.duplicateWords).slice(0, 6),
      weakBullets:     arr(result.weakBullets).slice(0, 3),
      strengths:       arr(result.strengths).slice(0, 6),
      weaknesses:      arr(result.weaknesses).slice(0, 5),
      suggestions:     arr(result.suggestions).slice(0, 6),
    };

    return NextResponse.json({ success: true, data: sanitized });
  } catch (err) {
    console.error("ANALYZE ERROR:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(val)));
}

function arr(val: unknown): string[] {
  return Array.isArray(val) ? (val as string[]) : [];
}