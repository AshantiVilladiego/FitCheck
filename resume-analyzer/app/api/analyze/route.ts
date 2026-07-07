import { NextRequest, NextResponse } from "next/server";
import { analyzeResumeWithGemini } from "@/lib/gemini";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALLOWED_TYPES = ["application/pdf"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB per resume
const MAX_FILES_PER_REQUEST = 25;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "You must be signed in to run an analysis." },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const resumes = formData.getAll("resumes") as File[];
    const jobDescription = formData.get("jobDescription") as string | null;
    const jobTitle = (formData.get("jobTitle") as string | null) || "Untitled";

    if (!resumes || resumes.length === 0) {
      return NextResponse.json({ error: "No resume files were uploaded." }, { status: 400 });
    }
    if (resumes.length > MAX_FILES_PER_REQUEST) {
      return NextResponse.json(
        { error: `Please upload ${MAX_FILES_PER_REQUEST} resumes or fewer at a time.` },
        { status: 400 }
      );
    }
    if (!jobDescription || jobDescription.trim().length < 20) {
      return NextResponse.json(
        { error: "Please provide a fuller job description (at least a few sentences)." },
        { status: 400 }
      );
    }

    // Create the run row up front — every candidate we analyze below
    // gets linked back to this run's id.
    const { data: run, error: runError } = await supabase
      .from("fit_check_runs")
      .insert({ user_id: user.id, job_title: jobTitle, job_description: jobDescription })
      .select()
      .single();

    if (runError) throw new Error(runError.message);

    const results: any[] = [];

    // Sequential, not Promise.all — keeps us comfortably inside Gemini's
    // free-tier rate limits when analyzing several resumes back to back.
    for (const file of resumes) {
      try {
        if (!ALLOWED_TYPES.includes(file.type)) {
          results.push({ filename: file.name, status: "error", message: "Only PDF resumes are supported" });
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          results.push({ filename: file.name, status: "error", message: "File too large (max 5MB)" });
          continue;
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const analysis = await analyzeResumeWithGemini({
          jobDescription,
          resumeFile: { base64: buffer.toString("base64"), mimeType: "application/pdf" },
        });

        const { error: insertError } = await supabase.from("fit_check_candidates").insert({
          run_id: run.id,
          filename: file.name,
          candidate_name: analysis.candidate_name,
          fit_score: analysis.fit_score,
          verdict: analysis.verdict,
          matched_skills: analysis.matched_skills,
          missing_skills: analysis.missing_skills,
          strengths: analysis.strengths,
          gaps: analysis.gaps,
          recommendation: analysis.recommendation,
        });
        if (insertError) throw new Error(insertError.message);

        results.push({ filename: file.name, status: "ok", ...analysis });
      } catch (fileErr: any) {
        results.push({
          filename: file.name,
          status: "error",
          message: fileErr?.message || "Failed to analyze this resume",
        });
      }
    }

    // Sort so the frontend receives candidates already ranked best-fit first.
    results.sort((a, b) => (b.fit_score ?? -1) - (a.fit_score ?? -1));

    return NextResponse.json({ runId: run.id, results }, { status: 200 });
  } catch (err: any) {
    console.error("Analyze route error:", err);
    return NextResponse.json(
      { error: err?.message || "Something went wrong while analyzing the resumes." },
      { status: 500 }
    );
  }
}
