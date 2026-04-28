export interface AnalysisResult {
  score: number;
  atsScore: number;
  readabilityScore: number;
  industry: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  weakBullets: string[];
  keywords: string[];
  missingKeywords: string[];
  duplicateWords: string[];
  wordCount: number;
  sections: {
    education: boolean;
    experience: boolean;
    skills: boolean;
    projects: boolean;
    summary: boolean;
  };
  contactInfo: {
    email: boolean;
    phone: boolean;
    linkedin: boolean;
    github: boolean;
    website: boolean;
  };
  metrics: {
    actionVerbCount: number;
    quantifiedAchievements: number;
    bulletPoints: number;
    pageEstimate: number;
  };
}

const TECH_KEYWORDS = [
  "React", "Vue", "Angular", "JavaScript", "TypeScript", "Python", "Java", "Go",
  "Rust", "C++", "C#", "Ruby", "PHP", "Swift", "Kotlin", "Node.js", "Next.js",
  "Express", "Django", "FastAPI", "Spring", "Docker", "Kubernetes", "AWS", "GCP",
  "Azure", "PostgreSQL", "MySQL", "MongoDB", "Redis", "GraphQL", "REST", "API",
  "Git", "CI/CD", "Linux", "Terraform", "Webpack", "Tailwind", "SQL", "NoSQL",
  "Machine Learning", "AI", "TensorFlow", "PyTorch", "Pandas", "NumPy",
  "Figma", "Sketch", "Adobe XD", "Jira", "Confluence", "Agile", "Scrum",
  "Microservices", "DevOps", "Serverless", "Firebase", "Supabase", "Prisma",
];

const MISSING_KEYWORD_POOL = [
  "Docker", "Kubernetes", "CI/CD", "TypeScript", "GraphQL", "AWS",
  "PostgreSQL", "Redis", "Terraform", "Microservices", "Agile", "Scrum",
];

const ACTION_VERBS = [
  "built", "developed", "designed", "led", "managed", "created", "implemented",
  "architected", "optimized", "improved", "reduced", "increased", "launched",
  "deployed", "maintained", "collaborated", "delivered", "engineered", "automated",
  "integrated", "migrated", "refactored", "scaled", "mentored", "researched",
  "spearheaded", "streamlined", "coordinated", "established", "transformed",
  "negotiated", "analyzed", "generated", "produced", "supervised", "facilitated",
];

const WEAK_VERBS = [
  "worked on", "helped with", "assisted", "was responsible for", "did",
  "made", "used", "handled", "participated in", "involved in",
];

const INDUSTRY_PATTERNS: Record<string, RegExp[]> = {
  "Software Engineering": [/software engineer/i, /full.?stack/i, /backend/i, /frontend/i, /web developer/i],
  "Data Science / ML": [/data science/i, /machine learning/i, /deep learning/i, /nlp/i, /data analyst/i],
  "DevOps / Cloud": [/devops/i, /cloud engineer/i, /site reliability/i, /infrastructure/i, /sre/i],
  "Product Management": [/product manager/i, /product owner/i, /roadmap/i, /stakeholder/i],
  "UX / Design": [/ux designer/i, /ui designer/i, /figma/i, /user research/i, /interaction design/i],
  "Cybersecurity": [/security engineer/i, /penetration/i, /vulnerability/i, /soc analyst/i, /cybersecurity/i],
  "Finance / Banking": [/financial analyst/i, /investment/i, /banking/i, /accounting/i, /cfa/i],
  "Healthcare": [/healthcare/i, /clinical/i, /medical/i, /nursing/i, /pharmacy/i],
  "Marketing": [/marketing/i, /seo/i, /content strategy/i, /brand/i, /digital marketing/i],
};

const SECTION_PATTERNS: Record<keyof AnalysisResult["sections"], RegExp[]> = {
  education: [/education/i, /university/i, /college/i, /degree/i, /bachelor/i, /master/i, /phd/i, /b\.s\./i, /m\.s\./i],
  experience: [/experience/i, /work history/i, /employment/i, /career/i, /professional background/i],
  skills: [/skills/i, /technologies/i, /competencies/i, /technical/i, /proficiencies/i, /tools/i],
  projects: [/projects/i, /portfolio/i, /work samples/i, /personal projects/i, /open.?source/i],
  summary: [/summary/i, /objective/i, /profile/i, /about me/i, /overview/i, /introduction/i],
};

function detectSections(text: string): AnalysisResult["sections"] {
  return Object.fromEntries(
    Object.entries(SECTION_PATTERNS).map(([key, patterns]) => [
      key,
      patterns.some((p) => p.test(text)),
    ])
  ) as AnalysisResult["sections"];
}

function detectContactInfo(text: string): AnalysisResult["contactInfo"] {
  return {
    email: /@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text),
    phone: /(\+?\d[\d\s\-().]{7,}\d)/.test(text),
    linkedin: /linkedin\.com\/in\//i.test(text),
    github: /github\.com\//i.test(text),
    website: /https?:\/\/(?!linkedin|github)[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/i.test(text),
  };
}

function detectKeywords(text: string): string[] {
  return TECH_KEYWORDS.filter((kw) =>
    new RegExp(`\\b${kw.replace(/[.+]/g, "\\$&")}\\b`, "i").test(text)
  );
}

function detectMissingKeywords(found: string[]): string[] {
  return MISSING_KEYWORD_POOL.filter((kw) => !found.includes(kw)).slice(0, 6);
}

function detectActionVerbCount(text: string): number {
  const lower = text.toLowerCase();
  return ACTION_VERBS.filter((v) => lower.includes(v)).length;
}

function detectWeakBullets(text: string): string[] {
  const lines = text.split(/\n/).map((l) => l.trim()).filter((l) => l.startsWith("•") || l.startsWith("-") || l.startsWith("*"));
  return lines
    .filter((line) => WEAK_VERBS.some((v) => line.toLowerCase().includes(v)))
    .slice(0, 4);
}

function detectQuantifiedAchievements(text: string): number {
  const matches = text.match(/\d+[\s]?(%|percent|x|times|users|customers|ms|seconds|minutes|hours|days|\$|USD|million|billion|k\b)/gi);
  return matches ? matches.length : 0;
}

function detectBulletPoints(text: string): number {
  return (text.match(/^[\s]*[•\-*]\s/gm) || []).length;
}

function estimatePages(wordCount: number): number {
  if (wordCount <= 500) return 1;
  if (wordCount <= 1000) return 1;
  if (wordCount <= 1500) return 2;
  return Math.ceil(wordCount / 750);
}

function detectDuplicateWords(text: string): string[] {
  const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
  const stopWords = new Set(["that", "with", "have", "this", "from", "they", "been", "were", "will", "your", "more", "also", "into", "than", "then", "when", "what", "which", "team", "work", "role", "time", "year", "able"]);
  const freq: Record<string, number> = {};
  for (const w of words) {
    if (!stopWords.has(w)) freq[w] = (freq[w] || 0) + 1;
  }
  return Object.entries(freq)
    .filter(([, count]) => count >= 4)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([word]) => word);
}

function detectIndustry(text: string): string {
  for (const [industry, patterns] of Object.entries(INDUSTRY_PATTERNS)) {
    if (patterns.some((p) => p.test(text))) return industry;
  }
  return "General / Other";
}

function calculateAtsScore(
  sections: AnalysisResult["sections"],
  keywords: string[],
  contactInfo: AnalysisResult["contactInfo"],
  wordCount: number
): number {
  let score = 0;
  if (sections.experience) score += 20;
  if (sections.skills) score += 15;
  if (sections.education) score += 10;
  if (sections.summary) score += 8;
  if (sections.projects) score += 7;
  if (contactInfo.email) score += 8;
  if (contactInfo.phone) score += 5;
  if (contactInfo.linkedin) score += 5;
  if (contactInfo.github) score += 4;
  score += Math.min(keywords.length * 1.2, 18);
  if (wordCount >= 300 && wordCount <= 1000) score += 10;
  else if (wordCount > 1000) score += 5;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function calculateReadabilityScore(text: string, bulletPoints: number, weakBullets: string[]): number {
  let score = 80;
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 10);
  const avgWordsPerSentence = sentences.length
    ? sentences.reduce((acc, s) => acc + s.trim().split(/\s+/).length, 0) / sentences.length
    : 0;
  if (avgWordsPerSentence > 25) score -= 15;
  else if (avgWordsPerSentence > 18) score -= 8;
  if (bulletPoints >= 5) score += 10;
  else if (bulletPoints >= 2) score += 5;
  score -= Math.min(weakBullets.length * 5, 20);
  return Math.max(0, Math.min(100, Math.round(score)));
}

function calculateScore(
  sections: AnalysisResult["sections"],
  keywords: string[],
  wordCount: number,
  actionVerbCount: number,
  quantified: number,
  contactInfo: AnalysisResult["contactInfo"]
): number {
  let score = 0;
  const sectionValues = { education: 10, experience: 18, skills: 13, projects: 10, summary: 9 };
  for (const [key, val] of Object.entries(sectionValues)) {
    if (sections[key as keyof typeof sections]) score += val;
  }
  score += Math.min(keywords.length * 1.3, 14);
  score += Math.min(actionVerbCount * 1.0, 10);
  score += Math.min(quantified * 2, 10);
  if (contactInfo.email) score += 3;
  if (contactInfo.linkedin) score += 2;
  if (wordCount >= 300 && wordCount <= 800) score += 8;
  else if (wordCount > 800 && wordCount <= 1200) score += 4;
  else if (wordCount < 150) score -= 8;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function generateStrengths(
  sections: AnalysisResult["sections"],
  keywords: string[],
  wordCount: number,
  actionVerbCount: number,
  quantified: number,
  contactInfo: AnalysisResult["contactInfo"]
): string[] {
  const s: string[] = [];
  if (sections.experience) s.push("Clear work experience section present");
  if (sections.education) s.push("Education credentials are well-documented");
  if (sections.skills) s.push("Dedicated skills section makes scanning easy for recruiters");
  if (sections.projects) s.push("Project portfolio demonstrates practical, hands-on ability");
  if (sections.summary) s.push("Professional summary provides a strong first impression");
  if (keywords.length >= 8) s.push(`Strong technical vocabulary — ${keywords.length} relevant keywords found`);
  if (actionVerbCount >= 5) s.push(`Good use of action verbs (${actionVerbCount} detected) — adds impact to bullets`);
  if (quantified >= 3) s.push(`${quantified} quantified achievements detected — shows measurable impact`);
  if (wordCount >= 300 && wordCount <= 800) s.push("Resume length is optimal for ATS and human readers");
  if (contactInfo.linkedin && contactInfo.github) s.push("LinkedIn and GitHub profiles boost professional credibility");
  return s.length > 0 ? s : ["Resume contains readable content — build on it with more structure"];
}

function generateWeaknesses(
  sections: AnalysisResult["sections"],
  keywords: string[],
  wordCount: number,
  actionVerbCount: number,
  quantified: number
): string[] {
  const w: string[] = [];
  if (!sections.experience) w.push("No dedicated experience section detected — critical for any resume");
  if (!sections.education) w.push("Education section is missing or not clearly labeled");
  if (!sections.skills) w.push("Skills section not found — heavily penalized by ATS systems");
  if (!sections.projects) w.push("No projects section — missed opportunity to showcase hands-on work");
  if (!sections.summary) w.push("Missing professional summary — lose recruiter attention in first 6 seconds");
  if (keywords.length < 5) w.push("Low technical keyword density — likely to be filtered out by ATS");
  if (actionVerbCount < 3) w.push("Weak use of action verbs — bullet points lack impact and energy");
  if (quantified < 2) w.push("Very few quantified achievements — add numbers, percentages, or dollar amounts");
  if (wordCount < 200) w.push("Resume is too short — add more detail to each role and project");
  if (wordCount > 1200) w.push("Resume exceeds recommended length — aim for 1 page (or 2 max for seniors)");
  return w;
}

function generateSuggestions(
  sections: AnalysisResult["sections"],
  keywords: string[],
  wordCount: number,
  actionVerbCount: number,
  quantified: number,
  contactInfo: AnalysisResult["contactInfo"]
): string[] {
  const s: string[] = [];
  if (!sections.summary) s.push('Add a 2–3 line professional summary at the top (e.g. "Full-stack engineer with 3 years...")');
  if (!sections.projects) s.push("Include 2–3 projects with measurable impact (e.g. '40% faster load time, 500 users')");
  if (keywords.length < 8) s.push("Weave in more industry keywords naturally — mirror the job description language");
  if (actionVerbCount < 5) s.push("Start every bullet with a strong action verb: Built, Architected, Scaled, Reduced, Led");
  if (quantified < 3) s.push("Quantify results — add metrics like '↑30% retention', '$50K saved', '10K daily users'");
  if (!contactInfo.linkedin) s.push("Add your LinkedIn profile URL — most recruiters verify it before reaching out");
  if (!contactInfo.github) s.push("Include a GitHub link to demonstrate active coding and open-source contributions");
  if (wordCount < 300) s.push("Expand each role with 3–5 bullet points describing your contributions and outcomes");
  if (!sections.skills) s.push("Create a dedicated Skills section grouped by category (Languages, Frameworks, Tools)");
  s.push("Tailor your resume to each job — swap in keywords from the specific job description");
  return s.slice(0, 6);
}

export function analyzeResume(text: string): AnalysisResult {
  const words = text.trim().split(/\s+/);
  const wordCount = words.length;

  const sections = detectSections(text);
  const contactInfo = detectContactInfo(text);
  const keywords = detectKeywords(text);
  const missingKeywords = detectMissingKeywords(keywords);
  const actionVerbCount = detectActionVerbCount(text);
  const weakBullets = detectWeakBullets(text);
  const quantifiedAchievements = detectQuantifiedAchievements(text);
  const bulletPoints = detectBulletPoints(text);
  const duplicateWords = detectDuplicateWords(text);
  const industry = detectIndustry(text);
  const pageEstimate = estimatePages(wordCount);

  const atsScore = calculateAtsScore(sections, keywords, contactInfo, wordCount);
  const readabilityScore = calculateReadabilityScore(text, bulletPoints, weakBullets);
  const score = calculateScore(sections, keywords, wordCount, actionVerbCount, quantifiedAchievements, contactInfo);

  return {
    score,
    atsScore,
    readabilityScore,
    industry,
    sections,
    contactInfo,
    keywords,
    missingKeywords,
    duplicateWords,
    weakBullets,
    wordCount,
    strengths: generateStrengths(sections, keywords, wordCount, actionVerbCount, quantifiedAchievements, contactInfo),
    weaknesses: generateWeaknesses(sections, keywords, wordCount, actionVerbCount, quantifiedAchievements),
    suggestions: generateSuggestions(sections, keywords, wordCount, actionVerbCount, quantifiedAchievements, contactInfo),
    metrics: {
      actionVerbCount,
      quantifiedAchievements,
      bulletPoints,
      pageEstimate,
    },
  };
}