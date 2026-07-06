"use client";

import { useCallback, useRef, useState } from "react";
import { UploadFileResult } from "@/types/candidate";
import { getErrorMessage } from "@/lib/errors";

interface BulkUploadProps {
  onUploadComplete: (results: UploadFileResult[]) => void;
}

const ACCEPTED_EXTENSIONS = [".pdf"];

export default function BulkUpload({ onUploadComplete }: BulkUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [count, setCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setUploading(true);
      setCount(files.length);

      try {
        const formData = new FormData();
        Array.from(files).forEach((f) => formData.append("resumes", f));

        const res = await fetch("/api/resumes/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error || "Upload failed");

        onUploadComplete(data.results as UploadFileResult[]);
      } catch (err: any) {
        console.error("Bulk upload failed:", err);
        onUploadComplete([
          { filename: "batch", status: "error", message: getErrorMessage(err) },
        ]);
      } finally {
        setUploading(false);
      }
    },
    [onUploadComplete]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      className={`flex min-h-[160px] cursor-pointer flex-col items-center justify-center gap-2 border-2 border-dashed p-6 text-center transition-colors ${
        isDragging ? "border-ink bg-highlight/20" : "border-line bg-white hover:border-ink/60"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_EXTENSIONS.join(",")}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {uploading ? (
        <>
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-ink" />
          <span className="font-mono text-xs text-slate">
            Indexing {count} resume{count === 1 ? "" : "s"}…
          </span>
        </>
      ) : (
        <>
          <span className="font-display text-lg font-medium text-ink">
            Drop resumes here to index them
          </span>
          <span className="font-mono text-xs text-slate">
            Select multiple PDF resumes — max 25 at a time
          </span>
        </>
      )}
    </div>
  );
}
