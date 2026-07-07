import { createBrowserClient } from "@supabase/ssr";

/**
 * Uses the public anon key — safe to expose to the browser. Row Level
 * Security policies on each table (see supabase/schema.sql) are what
 * actually enforce that a signed-in user can only see their own data,
 * not the key itself.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
