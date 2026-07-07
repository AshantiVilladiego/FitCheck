"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getErrorMessage } from "@/lib/errors";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showResend, setShowResend] = useState(false);
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent">("idle");

  function resetMessages() {
    setError(null);
    setNotice(null);
    setShowResend(false);
    setResendStatus("idle");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    resetMessages();

    const supabase = createSupabaseBrowserClient();

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;

        if (data.session) {
          // "Confirm email" is off — signUp logs us straight in.
          router.push("/");
          router.refresh();
          return;
        }

        // Confirmation is required. Note: if this email already has an
        // account, Supabase intentionally does NOT reveal that or send a
        // new email here (it's a security measure against email
        // enumeration) — it looks identical to a brand-new signup. If
        // you don't get an email within a minute, use Resend below,
        // which uses the explicit resend endpoint instead.
        setNotice(
          "Almost there — check your inbox for a confirmation link. If it doesn't arrive in a minute (check spam too), use Resend below."
        );
        setShowResend(true);
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (/confirm/i.test(error.message)) {
            setShowResend(true);
          }
          throw error;
        }
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      console.error("Auth error:", err);
      setError(getErrorMessage(err, "Something went wrong. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!email.trim()) {
      setError("Enter your email above first.");
      return;
    }
    setResendStatus("sending");
    setError(null);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) throw error;
      setResendStatus("sent");
      setNotice("Confirmation email resent — check your inbox (and spam folder).");
    } catch (err) {
      console.error("Resend error:", err);
      setError(getErrorMessage(err, "Couldn't resend the email. Try again in a minute."));
      setResendStatus("idle");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
        Fit Check
      </h1>
      <p className="mt-2 font-body text-sm text-slate">
        {mode === "signin"
          ? "Sign in to analyze and search resumes."
          : "Create an account to get started."}
      </p>

      <div className="mt-6 flex gap-1 font-mono text-xs uppercase tracking-widest">
        <button
          type="button"
          onClick={() => {
            setMode("signin");
            resetMessages();
          }}
          className={`px-3 py-1.5 transition-colors ${
            mode === "signin" ? "bg-ink text-paper" : "border border-line bg-white text-slate hover:text-ink"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            resetMessages();
          }}
          className={`px-3 py-1.5 transition-colors ${
            mode === "signup" ? "bg-ink text-paper" : "border border-line bg-white text-slate hover:text-ink"
          }`}
        >
          Create account
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full border-2 border-line bg-white px-4 py-3 font-body text-sm text-ink outline-none transition-colors placeholder:text-slate-light focus:border-ink"
        />
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (min. 6 characters)"
          className="w-full border-2 border-line bg-white px-4 py-3 font-body text-sm text-ink outline-none transition-colors placeholder:text-slate-light focus:border-ink"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full border-2 border-ink bg-ink px-6 py-3 font-display text-sm font-semibold uppercase tracking-wide text-paper transition-transform disabled:cursor-not-allowed disabled:opacity-50 enabled:hover:-translate-y-0.5"
        >
          {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>

        {notice && (
          <div className="highlighter-mark-yellow border-2 border-ink p-3 font-mono text-xs text-ink">
            {notice}
          </div>
        )}

        {error && (
          <p className="border-2 border-flag bg-white p-3 font-mono text-xs text-flag">
            {error}
          </p>
        )}

        {showResend && (
          <button
            type="button"
            onClick={handleResend}
            disabled={resendStatus === "sending" || resendStatus === "sent"}
            className="w-full border-2 border-line bg-white px-4 py-2 font-mono text-xs uppercase tracking-widest text-slate transition-colors hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
          >
            {resendStatus === "sending"
              ? "Resending…"
              : resendStatus === "sent"
              ? "Sent — check your inbox"
              : "Resend confirmation email"}
          </button>
        )}
      </form>
    </main>
  );
}
