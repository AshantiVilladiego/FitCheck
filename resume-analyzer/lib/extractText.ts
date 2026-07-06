// pdf-parse's default export runs a debug code path when imported normally
// in some bundlers — importing the lib entry point directly avoids that.
import pdfParse from "pdf-parse/lib/pdf-parse.js";

/**
 * Extracts plain text from a PDF file buffer.
 *
 * Resumes are restricted to PDF across the app (see ALLOWED_TYPES in the
 * API routes), so this only needs to handle one format. Used by the
 * Candidate Search bulk-upload route to get text for embeddings — the
 * Fit Check route does NOT use this, since it sends PDFs directly to
 * Gemini as inline file data instead (Gemini reads PDFs natively,
 * including layout, which gives better analysis than raw text extraction).
 */
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const result = await pdfParse(buffer);
  return result.text;
}
