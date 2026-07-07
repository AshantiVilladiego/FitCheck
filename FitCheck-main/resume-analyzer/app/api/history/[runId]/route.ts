export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { runId: string } }
) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    // The RLS delete policy already restricts this to the caller's own
    // runs, but scoping the query explicitly too avoids relying on RLS alone.
    const { error } = await supabase
      .from("fit_check_runs")
      .delete()
      .eq("id", params.runId)
      .eq("user_id", user.id);

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error("Delete run error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to delete this run." },
      { status: 500 }
    );
  }
}
