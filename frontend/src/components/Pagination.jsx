import { ChevronLeft, ChevronRight } from "lucide-react";

// Pagination (Phase 8 / Fase 2): ringkasan + prev/next + nomor halaman ringkas.
function pages(current, total) {
  const out = [];
  const push = (v) => out.push(v);
  const window = 1;
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - window && i <= current + window)) push(i);
    else if (out[out.length - 1] !== "…") push("…");
  }
  return out;
}

export default function Pagination({ page, totalPages, total, onChange, className = "" }) {
  if (!totalPages || totalPages <= 1) return null;
  const btn =
    "inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm transition-colors disabled:opacity-40 disabled:pointer-events-none";
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 ${className}`}>
      {typeof total === "number" && <p className="text-xs text-fg-faint">{total} item</p>}
      <div className="flex items-center gap-1">
        <button className={`${btn} text-fg-muted hover:bg-surface-hover`} disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Sebelumnya">
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pages(page, totalPages).map((p, i) =>
          p === "…" ? (
            <span key={`e${i}`} className="px-1 text-sm text-fg-faint">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p)}
              aria-current={p === page}
              className={`${btn} ${p === page ? "bg-brand-subtle font-medium text-brand-subtle-fg" : "text-fg-muted hover:bg-surface-hover"}`}
            >
              {p}
            </button>
          )
        )}
        <button className={`${btn} text-fg-muted hover:bg-surface-hover`} disabled={page >= totalPages} onClick={() => onChange(page + 1)} aria-label="Berikutnya">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
