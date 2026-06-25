// Area chart mini (Phase 8 / Fase 2) — SVG murni, tanpa dependency.
// data: array angka. Warna ikut `text-*` (currentColor) dari className.
export default function MiniAreaChart({ data = [], height = 64, className = "text-brand" }) {
  const n = data.length;
  if (n < 2) return <div style={{ height }} className="flex items-center justify-center text-xs text-fg-faint">Belum ada data</div>;

  const max = Math.max(1, ...data);
  const stepX = 100 / (n - 1);
  const pts = data.map((v, i) => [i * stepX, height - (v / max) * (height - 6) - 3]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(" ");
  const area = `${line} L100 ${height} L0 ${height} Z`;

  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className={`w-full ${className}`} style={{ height }} aria-hidden="true">
      <path d={area} fill="currentColor" opacity="0.1" />
      <path d={line} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
