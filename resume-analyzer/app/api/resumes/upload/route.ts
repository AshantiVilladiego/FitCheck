import { NextRequest, NextResponse } from "next/server";
import { extractTextFromPdf } from "@/lib/extractText";
import { embedText } from "@/lib/embeddings";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { UploadFileResult } from "@/types/candidate";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_TYPES = ["application/pdf"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB per file
const MAX_FILES_PER_REQUEST = 25;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "You must be signed in to index resumes." },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const files = formData.getAll("resumes") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No resume files were uploaded." },
        { status: 400 }
      );
    }

    if (files.length > MAX_FILES_PER_REQUEST) {
      return NextResponse.json(
        { error: `Please upload ${MAX_FILES_PER_REQUEST} files or fewer at a time.` },
        { status: 400 }
      );
    }

    const results: UploadFileResult[] = [];

    // Sequential, not Promise.all — keeps us comfortably inside Gemini's
    // free-tier rate limits instead of firing 25 embedding calls at once.
    for (const file of files) {
      try {
        if (!ALLOWED_TYPES.includes(file.type)) {
          results.push({ filename: file.name, status: "error", message: "Only PDF files are supported" });
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          results.push({ filename: file.name, status: "error", message: "File too large (max 5MB)" });
          continue;
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const text = await extractTextFromPdf(buffer);

        if (!text.trim()) {
          results.push({ filename: file.name, status: "error", message: "No readable text found" });
          continue;
        }

        const embedding = await embedText(text);

        // Using the user-scoped client here (not an admin client) means
        // RLS's insert policy applies automatically — this insert would
        // be rejected by the database itself if user_id didn't match
        // the signed-in user.
        const { error } = await supabase.from("resumes").insert({
          user_id: user.id,
          filename: file.name,
          resume_text: text,
          embedding,
        });

        if (error) throw new Error(error.message);

        results.push({ filename: file.name, status: "ok" });
      } catch (fileErr: any) {
        results.push({
          filename: file.name,
          status: "error",
          message: fileErr?.message || "Failed to process this file",
        });
      }
    }

    return NextResponse.json({ results }, { status: 200 });
  } catch (err: any) {
    console.error("Bulk upload route error:", err);
    return NextResponse.json(
      { error: err?.message || "Bulk upload failed." },
      { status: 500 }
    );
  }
}
