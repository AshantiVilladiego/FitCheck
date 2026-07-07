"use client";

import { AnalysisResult } from "@/types/analysis";
import ScoreMeter from "./ScoreMeter";

interface ResultPanelProps {
  result: AnalysisResult & { candidateName?: string; filename?: string };
}

function SkillChip({ label, matched }: { label: string; matched: boolean }) {
  return (
    <span
      className={`inline-block px-2 py-1 font-mono text-xs ${
        matched ? "highlighter-mark text-ink" : "text-slate line-through decoration-flag"
      }`}
    >
      {label}
    </span>
  );
}

export default function ResultPanel({ result }: ResultPanelProps) {
  const displayName =
    result.candidateName || result.candidate_name || result.filename || "Candidate";

  return (
    <div className="border-2 border-ink bg-white p-8">
      <div className="flex flex-col items-center gap-8 border-b border-line pb-8 md:flex-row md:items-start md:justify-between">
        <div className="order-2 md:order-1 md:max-w-sm">
          <h2 className="font-display text-2xl font-semibold text-ink">
            {displayName}
          </h2>
          {result.filename && (
            <p className="font-mono text-xs text-slate-light">{result.filename}</p>
          )}
          <p className="mt-2 font-body text-sm leading-relaxed text-slate">
            {result.strengths}
          </p>
        </div>
        <div className="order-1 md:order-2">
          <ScoreMeter score={result.fit_score} verdict={result.verdict} />
        </div>
      </div>

      <div className="grid gap-8 pt-8 md:grid-cols-2">
        <div>
          <h3 className="mb-3 font-mono text-xs uppercase tracking-widest text-slate">
            Matched skills ({result.matched_skills.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {result.matched_skills.length > 0 ? (
              result.matched_skills.map((skill) => (
                <SkillChip key={skill} label={skill} matched />
              ))
            ) : (
              <span className="font-body text-sm text-slate">None found.</span>
            )}
          </div>
        </div>

        <div>
          <h3 className="mb-3 font-mono text-xs uppercase tracking-widest text-slate">
            Missing skills ({result.missing_skills.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {result.missing_skills.length > 0 ? (
              result.missing_skills.map((skill) => (
                <SkillChip key={skill} label={skill} matched={false} />
              ))
            ) : (
              <span className="font-body text-sm text-slate">None — full coverage.</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 border-t border-line pt-8 md:grid-cols-2">
        <div>
          <h3 className="mb-2 font-mono text-xs uppercase tracking-widest text-flag">
            Gaps
          </h3>
          <p className="font-body text-sm leading-relaxed text-ink">{result.gaps}</p>
        </div>
        <div>
          <h3 className="mb-2 font-mono text-xs uppercase tracking-widest text-ink">
            Recommendation
          </h3>
          <p className="font-body text-sm leading-relaxed text-ink">
            {result.recommendation}
          </p>
        </div>
      </div>
    </div>
  );
}
