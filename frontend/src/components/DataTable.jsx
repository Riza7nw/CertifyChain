// Tabel responsif (Phase 8 / Fase 2): tabel di desktop, kartu di mobile.
// columns: [{ header, cell:(row)=>node, align?, primary?:bool (judul kartu mobile), hideLabel?:bool }]
export default function DataTable({ columns, rows, rowKey = (r, i) => i, empty = null, onRowClick }) {
  if (!rows?.length) return empty;

  return (
    <div>
      {/* Desktop */}
      <table className="hidden w-full text-sm sm:table">
        <thead>
          <tr className="border-b border-line text-left text-[11px] font-medium uppercase tracking-wide text-fg-faint">
            {columns.map((c, i) => (
              <th key={i} className={`px-3 py-2.5 first:pl-1 ${c.align === "right" ? "text-right" : ""}`}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={rowKey(row, ri)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-b border-line last:border-0 ${onRowClick ? "cursor-pointer hover:bg-surface-hover" : ""}`}
            >
              {columns.map((c, ci) => (
                <td key={ci} className={`px-3 py-3 align-middle first:pl-1 ${c.align === "right" ? "text-right" : ""}`}>
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile */}
      <div className="space-y-2.5 sm:hidden">
        {rows.map((row, ri) => {
          const primary = columns.find((c) => c.primary);
          const rest = columns.filter((c) => !c.primary);
          return (
            <div
              key={rowKey(row, ri)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className="rounded-xl border border-line p-3.5"
            >
              {primary && <div className="mb-2 font-medium text-fg">{primary.cell(row)}</div>}
              <div className="space-y-1.5">
                {rest.map((c, ci) => (
                  <div key={ci} className="flex items-center justify-between gap-3 text-sm">
                    {!c.hideLabel && <span className="text-xs text-fg-faint">{c.header}</span>}
                    <span className={c.hideLabel ? "w-full" : "text-right"}>{c.cell(row)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
