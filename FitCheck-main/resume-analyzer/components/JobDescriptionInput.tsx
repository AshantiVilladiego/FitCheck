"use client";

interface JobDescriptionInputProps {
  value: string;
  onChange: (value: string) => void;
}

export default function JobDescriptionInput({
  value,
  onChange,
}: JobDescriptionInputProps) {
  return (
    <div>
      <label className="mb-2 block font-mono text-xs uppercase tracking-widest text-slate">
        Job Description
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Paste the full job description here — responsibilities, requirements, qualifications..."
        rows={8}
        className="w-full resize-none border-2 border-line bg-white p-4 font-body text-sm text-ink outline-none transition-colors placeholder:text-slate-light focus:border-ink"
      />
      <div className="mt-1 text-right font-mono text-[11px] text-slate-light">
        {value.length} characters
      </div>
    </div>
  );
}
