const EMBED_MODEL = "text-embedding-004";
const EMBED_URL = `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:embedContent`;

// Rough safety cap on input length. text-embedding-004 accepts up to
// ~2048 tokens; trimming here avoids a 400 on unusually long resumes.
const MAX_CHARS = 18000;

/**
 * Turns text into a 768-dimension embedding vector using Gemini's free
 * text-embedding-004 model. Used both when indexing resumes and when
 * embedding a search query, so the two vectors live in the same space
 * and can be compared with cosine similarity.
 */
export async function embedText(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in the environment");
  }

  const trimmed = text.slice(0, MAX_CHARS);

  const res = await fetch(`${EMBED_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: `models/${EMBED_MODEL}`,
      content: { parts: [{ text: trimmed }] },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Gemini embedding error (${res.status}): ${errBody}`);
  }

  const data = await res.json();
  const values = data?.embedding?.values;

  if (!values || !Array.isArray(values)) {
    throw new Error("Gemini returned no embedding values");
  }

  return values as number[];
}
