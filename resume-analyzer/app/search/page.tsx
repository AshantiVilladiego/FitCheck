"use client";

import { useState } from "react";
import NavHeader from "@/components/NavHeader";
import BulkUpload from "@/components/BulkUpload";
import UploadSummary from "@/components/UploadSummary";
import CandidateResultCard from "@/components/CandidateResultCard";
import { CandidateMatch, UploadFileResult } from "@/types/candidate";
import { getErrorMessage } from "@/lib/errors";

export default function SearchPage() {
  const [uploadResults, setUploadResults] = useState<UploadFileResult[] | null>(null);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [matches, setMatches] = useState<CandidateMatch[] | null>(null);

  async function handleSearch() {
    if (query.trim().length < 5) return;
    setSearching(true);
    setSearchError(null);
    setMatches(null);

    try {
      const res = await fetch("/api/resumes/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, matchCount: 5 }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Search failed");

      setMatches(data.matches as CandidateMatch[]);
    } catch (err: any) {
      console.error("Candidate search failed:", err);
      setSearchError(getErrorMessage(err));
    } finally {
      setSearching(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-16">
      <NavHeader />
      <p className="-mt-10 mb-10 max-w-xl font-body text-sm text-slate">
        Index a batch of resumes once, then describe the candidate you want
        in plain language. Search ranks every indexed resume by semantic
        similarity — not keyword matching.
      </p>

      <section>
        <label className="mb-2 block font-mono text-xs uppercase tracking-widest text-slate">
          01 — Index resumes
        </label>
        <BulkUpload onUploadComplete={setUploadResults} />
        {uploadResults && (
          <div className="mt-4">
            <UploadSummary results={uploadResults} />
          </div>
        )}
      </section>

      <section className="mt-10">
        <label className="mb-2 block font-mono text-xs uppercase tracking-widest text-slate">
          02 — Describe the candidate you need
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="e.g. Strong frontend engineer with cloud deployment experience"
            className="flex-1 border-2 border-line bg-white px-4 py-3 font-body text-sm text-ink outline-none transition-colors placeholder:text-slate-light focus:border-ink"
          />
          <button
            onClick={handleSearch}
            disabled={query.trim().length < 5 || searching}
            className="border-2 border-ink bg-ink px-6 py-3 font-display text-sm font-semibold uppercase tracking-wide text-paper transition-transform disabled:cursor-not-allowed disabled:border-line disabled:bg-line disabled:text-slate-light enabled:hover:-translate-y-0.5"
          >
            {searching ? "Searching…" : "Search"}
          </button>
        </div>
        {searchError && (
          <p className="mt-2 font-mono text-xs text-flag">{searchError}</p>
        )}
      </section>

      {matches && (
        <section className="mt-10 space-y-3">
          <h2 className="font-mono text-xs uppercase tracking-widest text-slate">
            {matches.length} result{matches.length === 1 ? "" : "s"}, ranked by fit
          </h2>
          {matches.length === 0 ? (
            <p className="font-body text-sm text-slate">
              No resumes are indexed yet — upload some above first.
            </p>
          ) : (
            matches.map((m, i) => (
              <CandidateResultCard key={m.id} candidate={m} rank={i + 1} />
            ))
          )}
        </section>
      )}
    </main>
  );
}
