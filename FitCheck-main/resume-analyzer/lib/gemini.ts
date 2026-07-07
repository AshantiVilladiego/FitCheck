import { AnalysisResult } from "@/types/analysis";

const GEMINI_MODEL = "gemini-3.1-flash-lite";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// JSON schema Gemini must follow. This removes the need to regex-parse
// free text out of the model's response.
const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    candidate_name: {
      type: "string",
      description: "The candidate's full name as it appears on the resume. If no name is found, use 'Unknown Candidate'.",
    },
    fit_score: {
      type: "integer",
      description: "Overall fit percentage from 0 to 100",
    },
    verdict: {
      type: "string",
      description: "One short headline, e.g. 'Strong match' or 'Weak match'",
    },
    matched_skills: {
      type: "array",
      items: { type: "string" },
      description: "Skills/requirements from the job description that the resume satisfies",
    },
    missing_skills: {
      type: "array",
      items: { type: "string" },
      description: "Skills/requirements from the job description the resume does not show",
    },
    strengths: {
      type: "string",
      description: "2-3 sentences on why this candidate fits well",
    },
    gaps: {
      type: "string",
      description: "2-3 sentences on the candidate's weak points for this role",
    },
    recommendation: {
      type: "string",
      description: "1-2 sentences of concrete advice to improve the resume for this job",
    },
  },
  required: [
    "candidate_name",
    "fit_score",
    "verdict",
    "matched_skills",
    "missing_skills",
    "strengths",
    "gaps",
    "recommendation",
  ],
};

const SYSTEM_PROMPT = `You are an expert technical recruiter and resume screener.
You will be given a candidate's resume and a job description.

First, extract the candidate's full name exactly as it appears on the resume
(usually at the top). If you genuinely cannot find a name, use "Unknown Candidate".

Then score how well the resume fits the job on a 0-100 scale, where:
- 90-100: Exceptional fit, meets nearly all requirements
- 70-89: Strong fit, meets most core requirements
- 50-69: Partial fit, meets some requirements but has real gaps
- Below 50: Weak fit, missing multiple core requirements

Be honest and specific. Base every judgment strictly on what is actually
written in the resume — do not assume skills that are not mentioned or implied.
List concrete skill names in matched_skills and missing_skills, not vague phrases.`;

interface AnalyzeParams {
  jobDescription: string;
  resumeText?: string;
  resumeFile?: { base64: string; mimeType: string };
}

export async function analyzeResumeWithGemini({
  jobDescription,
  resumeText,
  resumeFile,
}: AnalyzeParams): Promise<AnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in the environment");
  }

  const parts: any[] = [
    {
      text: `${SYSTEM_PROMPT}\n\nJOB DESCRIPTION:\n${jobDescription}\n\n${
        resumeText ? "RESUME TEXT:\n" + resumeText : "The resume file is attached below."
      }`,
    },
  ];

  if (resumeFile) {
    parts.push({
      inlineData: {
        mimeType: resumeFile.mimeType,
        data: resumeFile.base64,
      },
    });
  }

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.3,
      },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errBody}`);
  }

  const data = await res.json();
  const textOutput = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textOutput) {
    throw new Error("Gemini returned no analysis output");
  }

  const parsed: AnalysisResult = JSON.parse(textOutput);

  // Clamp the score defensively in case the model drifts outside 0-100
  parsed.fit_score = Math.max(0, Math.min(100, Math.round(parsed.fit_score)));

  return parsed;
}
