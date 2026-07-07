"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const TABS = [
  { href: "/", label: "Fit Check" },
];

export default function NavHeader() {
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  async function handleSignOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <header className="mb-14 border-b-2 border-ink pb-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">
          Fit Check
        </h1>
        <div className="flex flex-wrap items-center gap-4">
          <nav className="flex gap-1 font-mono text-xs uppercase tracking-widest">
            {TABS.map((tab) => {
              const active = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`px-3 py-1.5 transition-colors ${
                    active ? "bg-ink text-paper" : "text-slate hover:text-ink"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
          {email && (
            <div className="flex items-center gap-2 font-mono text-xs text-slate">
              <span className="hidden sm:inline">{email}</span>
              <button
                onClick={handleSignOut}
                className="border border-line px-2 py-1 uppercase tracking-widest text-slate transition-colors hover:border-ink hover:text-ink"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
