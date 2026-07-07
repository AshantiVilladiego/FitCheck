export interface AnalysisResult {
  candidate_name: string;
  fit_score: number; // 0-100
  verdict: string; // one-line headline verdict, e.g. "Strong match"
  matched_skills: string[];
  missing_skills: string[];
  strengths: string;
  gaps: string;
  recommendation: string;
}

export interface AnalyzeErrorResponse {
  error: string;
}
