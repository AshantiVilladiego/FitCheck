import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Fail loud and specific if env vars are missing, instead of letting
  // createServerClient throw a generic, hard-to-trace error.
  if (!supabaseUrl || !supabaseKey) {
    console.error(
      "Middleware: missing Supabase env vars.",
      "URL present:", !!supabaseUrl,
      "KEY present:", !!supabaseKey
    );
    return response; // fail open so the site doesn't hard-crash
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request: { headers: request.headers } });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      // Don't throw — an expired/invalid session is expected, not a crash.
      console.warn("Middleware: getUser() returned an error:", error.message);
    }

    const isAuthRoute =
      request.nextUrl.pathname.startsWith("/login") ||
      request.nextUrl.pathname.startsWith("/auth");

    if (!user && !isAuthRoute) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    if (user && request.nextUrl.pathname.startsWith("/login")) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return response;
  } catch (err) {
    console.error("Middleware: unexpected exception:", err);
    return response;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
