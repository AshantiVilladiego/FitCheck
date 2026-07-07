import { NextRequest, NextResponse } from "next/server";
import { embedText } from "@/lib/embeddings";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CandidateMatch } from "@/types/candidate";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "You must be signed in to search resumes." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const query: string | undefined = body?.query;
    const matchCount: number = body?.matchCount ?? 5;

    if (!query || query.trim().length < 5) {
      return NextResponse.json(
        { error: "Describe the candidate you're looking for in a bit more detail." },
        { status: 400 }
      );
    }

    const queryEmbedding = await embedText(query);

    // match_resumes filters by auth.uid() internally, and RLS backs that
    // up at the table level — this call can only ever return resumes
    // this user indexed themselves.
    const { data, error } = await supabase.rpc("match_resumes", {
      query_embedding: queryEmbedding,
      match_count: matchCount,
    });

    if (error) throw new Error(error.message);

    return NextResponse.json({ matches: data as CandidateMatch[] }, { status: 200 });
  } catch (err: any) {
    console.error("Candidate search route error:", err);
    return NextResponse.json(
      { error: err?.message || "Search failed." },
      { status: 500 }
    );
  }
}
