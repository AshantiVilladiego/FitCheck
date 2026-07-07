export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    // RLS scopes this to the signed-in user's own runs automatically, but
    // .eq("user_id", user.id) is left explicit here too as a second layer.
    const { data, error } = await supabase
      .from("fit_check_runs")
      .select("*, fit_check_candidates(*)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return NextResponse.json({ runs: data }, { status: 200 });
  } catch (err: any) {
    console.error("List history error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to load history." },
      { status: 500 }
    );
  }
}
