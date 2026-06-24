import { useState } from "react";

// Menampilkan nilai panjang (hash/id/tx) dalam kotak monospace + tombol salin.
export default function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard tidak tersedia (mis. http non-secure) */
    }
  }

  return (
    <div>
      {label && <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>}
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
        <code className="flex-1 break-all font-mono text-xs text-slate-700">{value}</code>
        <button
          type="button"
          onClick={handleCopy}
          className="flex-shrink-0 rounded-md px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50"
        >
          {copied ? "Tersalin ✓" : "Salin"}
        </button>
      </div>
    </div>
  );
}
