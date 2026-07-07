"use client";

import { useState, useEffect, useRef } from "react";
import NavHeader from "@/components/NavHeader";
import JobDescriptionInput from "@/components/JobDescriptionInput";
import ResultPanel from "@/components/ResultPanel";
import { getErrorMessage } from "@/lib/errors";

export default function Home() {
  // 1. STATE
  const [resumeFiles, setResumeFiles] = useState<File[]>([]);
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any[] | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const abortControllerRef = useRef<AbortController | null>(null);
  const MAX_RESUMES = 5;

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/history");
      const data = await res.json();
      if (res.ok) setHistory(data.runs ?? []);
    } catch {
      // Non-fatal — history is a nice-to-have, don't block the rest of the page
    } finally {
      setHistoryLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  // 2. VALIDATION
  const canSubmit =
    resumeFiles.length > 0 &&
    jobDescription.trim().length >= 20 &&
    jobTitle.trim().length > 0 &&
    !loading;

  // 3. HANDLERS
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      // PDF only — matches the server-side restriction in /api/analyze
      const pdfsOnly = Array.from(e.target.files).filter(
        (f) => f.type === "application/pdf"
      );
      setResumeFiles((prev) => {
        const combined = [...prev, ...pdfsOnly];
        return combined.slice(0, MAX_RESUMES);
      });
    }
    e.target.value = "";
  };

  const removeFile = (indexToRemove: number) => {
    setResumeFiles((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const loadHistoryItem = (run: any) => {
    const candidateResults = (run.fit_check_candidates ?? [])
      .slice()
      .sort((a: any, b: any) => b.fit_score - a.fit_score)
      .map((c: any) => ({ ...c, candidateName: c.candidate_name }));

    setResults(candidateResults);
    setJobTitle(run.job_title);
    setJobDescription(run.job_description);
    setResumeFiles([]);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteRun = async (runId: string) => {
    await fetch(`/api/history/${runId}`, { method: "DELETE" });
    setHistory((prev) => prev.filter((r) => r.id !== runId));
  };

  const clearAllHistory = async () => {
    if (
      !confirm(
        "Are you sure you want to delete your entire search history? This cannot be undone."
      )
    ) {
      return;
    }
    await Promise.all(history.map((r) => fetch(`/api/history/${r.id}`, { method: "DELETE" })));
    setHistory([]);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setResults(null);

    abortControllerRef.current = new AbortController();

    try {
      const formData = new FormData();
      formData.append("jobDescription", jobDescription);
      formData.append("jobTitle", jobTitle);

      resumeFiles.forEach((file) => {
        formData.append("resumes", file);
      });

      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
        signal: abortControllerRef.current.signal,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Analysis failed.");
      }

      // candidate_name is the real field the Gemini schema returns.
      const normalizedResults = data.results.map((resItem: any) => ({
        ...resItem,
        candidateName: resItem.candidate_name || resItem.filename || "Unknown Candidate",
      }));

      setResults(normalizedResults);

      // The run + candidates were already persisted server-side by
      // /api/analyze — just refresh the history list from the source of
      // truth instead of duplicating that data client-side.
      loadHistory();
    } catch (err: any) {
      if (err.name === "AbortError") {
        setError("Analysis was canceled.");
      } else {
        console.error("Analyze request failed:", err);
        setError(getErrorMessage(err));
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  // --- HISTORY GROUPING LOGIC ---
  const groupedHistory = history.reduce((acc: any, run: any) => {
    const category = run.job_title || "Uncategorized";
    if (!acc[category]) acc[category] = [];
    acc[category].push(run);
    return acc;
  }, {});

  // 4. UI RENDER
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-16">
      <NavHeader />
      <p className="-mt-10 mb-10 max-w-xl font-body text-sm text-slate">
        Upload up to {MAX_RESUMES} resumes and paste a job description. The scanner reads them
        all and ranks who matches best — highlighting skills, gaps, and strengths in seconds.
      </p>

      {/* JOB TITLE / CATEGORY INPUT */}
      <div className="mb-8 flex flex-col">
        <label className="mb-2 font-mono text-xs uppercase tracking-widest text-slate">
          Job Title / Category (For History Grouping)
        </label>
        <input
          type="text"
          value={jobTitle}
          onChange={(e) => setJobTitle(e.target.value)}
          placeholder="e.g. Senior Frontend Engineer"
          className="border-2 border-line bg-white p-4 font-body text-sm text-ink focus:border-ink focus:outline-none"
        />
      </div>

      <section className="grid gap-8 md:grid-cols-2">
        <div className="flex flex-col border-2 border-line bg-white p-6">
          <label className="mb-4 block font-mono text-xs uppercase tracking-widest text-slate">
            Upload Resumes (PDF only) {resumeFiles.length}/{MAX_RESUMES}
          </label>

          <input
            type="file"
            multiple
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            disabled={resumeFiles.length >= MAX_RESUMES}
            className="w-full text-sm file:mr-4 file:border-0 file:bg-ink file:px-4 file:py-2 file:font-semibold file:text-paper hover:file:bg-ink/80 disabled:opacity-50"
          />

          {resumeFiles.length > 0 && (
            <ul className="mt-4 space-y-2 border-t-2 border-line pt-4">
              {resumeFiles.map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between border border-line bg-paper p-2 text-sm text-ink"
                >
                  <span className="truncate pr-4">{file.name}</span>
                  <button
                    onClick={() => removeFile(index)}
                    className="font-bold text-slate hover:text-flag"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <JobDescriptionInput value={jobDescription} onChange={setJobDescription} />
      </section>

      <div className="mt-8 flex items-center gap-4">
        {!loading ? (
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="border-2 border-ink bg-ink px-6 py-3 font-display text-sm font-semibold uppercase tracking-wide text-paper transition-transform disabled:cursor-not-allowed disabled:border-line disabled:bg-line disabled:text-slate-light enabled:hover:-translate-y-0.5"
          >
            Run Analysis
          </button>
        ) : (
          <button
            onClick={handleCancel}
            className="border-2 border-flag bg-flag px-6 py-3 font-display text-sm font-semibold uppercase tracking-wide text-white transition-transform hover:-translate-y-0.5"
          >
            Cancel Analysis
          </button>
        )}

        {error && <span className="font-mono text-xs text-flag">{error}</span>}
      </div>

      {loading && (
        <div className="mt-16 flex flex-col items-center gap-3 text-slate">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-line border-t-ink" />
          <span className="font-mono text-xs uppercase tracking-widest">
            Analyzing {resumeFiles.length} candidates against the job description…
          </span>
        </div>
      )}

      {/* RESULTS LIST */}
      {results && !loading && (
        <div className="mt-16 space-y-8">
          <div className="flex items-center justify-between border-b-2 border-line pb-2">
            <h2 className="font-mono text-xs uppercase tracking-widest text-slate">
              Ranked Candidates ({results.length})
            </h2>
            <button
              onClick={() => setResults(null)}
              className="text-xs font-semibold text-slate underline hover:text-ink"
            >
              Clear Results
            </button>
          </div>

          {results.map((candidateResult, index) => (
            <div key={index} className="relative">
              <div className="absolute -left-12 top-4 hidden font-display text-2xl font-bold text-slate-light md:block">
                #{index + 1}
              </div>
              <ResultPanel result={candidateResult} />
            </div>
          ))}
        </div>
      )}

      {/* GROUPED HISTORY LIST */}
      {!historyLoading && Object.keys(groupedHistory).length > 0 && (
        <div className="mt-24 space-y-12">
          <div className="flex items-center justify-between border-b-2 border-ink pb-2">
            <h2 className="font-mono text-xs uppercase tracking-widest text-slate">
              Search History Workspace
            </h2>
            <button
              onClick={clearAllHistory}
              className="font-mono text-xs font-bold uppercase tracking-wider text-flag hover:underline"
            >
              Clear History ✕
            </button>
          </div>

          {Object.entries(groupedHistory).map(([category, runs]: [string, any]) => (
            <div key={category} className="mt-6">
              <h3 className="mb-6 border-b border-line pb-1 font-mono text-sm uppercase tracking-widest text-ink">
                {category}
              </h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {runs.map((run: any) => {
                  const candidates = run.fit_check_candidates ?? [];
                  const top = candidates
                    .slice()
                    .sort((a: any, b: any) => b.fit_score - a.fit_score)[0];

                  return (
                    <div key={run.id} className="group relative border-2 border-line bg-white p-4 text-left text-sm">
                      <button
                        onClick={() => deleteRun(run.id)}
                        className="absolute right-2 top-2 font-bold text-slate hover:text-flag"
                        aria-label="Delete this run"
                      >
                        ✕
                      </button>
                      <button
                        onClick={() => loadHistoryItem(run)}
                        className="w-full text-left transition-colors hover:opacity-80 focus:outline-none"
                      >
                        <p className="mb-2 font-mono text-xs text-slate-light">
                          {new Date(run.created_at).toLocaleDateString()}
                        </p>
                        <p className="mb-2 pr-4 font-semibold text-ink line-clamp-2 group-hover:underline">
                          "{run.job_description.slice(0, 60)}..."
                        </p>
                        <div className="mt-2 flex justify-between border-t-2 border-line pt-2">
                          <span className="text-slate">{candidates.length} Resumes</span>
                          <span className="font-bold text-ink">
                            {top ? `Top: ${top.candidate_name} (${top.fit_score}%)` : "No results"}
                          </span>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
