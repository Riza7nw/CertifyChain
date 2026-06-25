import { useState } from "react";
import { Check, Copy } from "lucide-react";

// Nilai panjang (hash/id/tx) dalam kotak mono + tombol salin (Phase 8, token-based).
export default function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard tak tersedia (http non-secure) */
    }
  }

  return (
    <div>
      {label && <p className="mb-1 text-xs font-medium text-fg-faint">{label}</p>}
      <div className="flex items-center gap-2 rounded-lg border border-line bg-app px-3 py-2">
        <code className="flex-1 break-all font-mono text-xs text-fg-muted">{value}</code>
        <button
          type="button"
          onClick={handleCopy}
          className="flex flex-shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand hover:bg-brand-subtle"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Tersalin" : "Salin"}
        </button>
      </div>
    </div>
  );
}
