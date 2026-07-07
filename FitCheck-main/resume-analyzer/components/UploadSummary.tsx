"use client";

import { UploadFileResult } from "@/types/candidate";

export default function UploadSummary({ results }: { results: UploadFileResult[] }) {
  const okCount = results.filter((r) => r.status === "ok").length;
  const errorResults = results.filter((r) => r.status === "error");

  return (
    <div className="border-2 border-line bg-white p-4">
      <p className="font-mono text-xs uppercase tracking-widest text-slate">
        Indexed {okCount} of {results.length} file{results.length === 1 ? "" : "s"}
      </p>
      {errorResults.length > 0 && (
        <ul className="mt-2 space-y-1">
          {errorResults.map((r) => (
            <li key={r.filename} className="font-mono text-xs text-flag">
              {r.filename}: {r.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
