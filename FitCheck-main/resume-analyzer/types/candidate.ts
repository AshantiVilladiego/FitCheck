export interface CandidateMatch {
  id: string;
  filename: string;
  resume_text: string;
  similarity: number; // 0-1, cosine similarity from pgvector
}

export interface UploadFileResult {
  filename: string;
  status: "ok" | "error";
  message?: string;
}
