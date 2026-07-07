import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * This client is bound to the request's session cookie, so any query it
 * runs is executed AS the signed-in user — Postgres Row Level Security
 * then naturally scopes every read/write to that user's own rows.
 *
 * This is intentionally NOT the service-role admin client. Using the
 * user-scoped client here means privacy is enforced at the database
 * level, not just by application code remembering to filter by user_id.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Can be called from a Server Component (no writable response
            // there) — safe to ignore since middleware refreshes the
            // session cookie on every request anyway.
          }
        },
      },
    }
  );
}
