"use client";

import { CandidateMatch } from "@/types/candidate";

function snippet(text: string, length = 240) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > length ? clean.slice(0, length) + "…" : clean;
}

export default function CandidateResultCard({
  candidate,
  rank,
}: {
  candidate: CandidateMatch;
  rank: number;
}) {
  const similarityPct = Math.round(candidate.similarity * 100);

  return (
    <div className="flex gap-4 border-2 border-line bg-white p-5">
      <div className="font-mono text-2xl font-semibold text-slate-light">
        {String(rank).padStart(2, "0")}
      </div>
      <div className="flex-1">
        <div className="flex items-start justify-between gap-4">
          <h3 className="font-display text-lg font-semibold text-ink">
            {candidate.filename}
          </h3>
          <span
            className={`shrink-0 px-2 py-0.5 font-mono text-xs ${
              similarityPct >= 70
                ? "highlighter-mark text-ink"
                : "border border-line text-slate"
            }`}
          >
            {similarityPct}% match
          </span>
        </div>
        <p className="mt-2 font-body text-sm leading-relaxed text-slate">
          {snippet(candidate.resume_text)}
        </p>
      </div>
    </div>
  );
}
