import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

// Header halaman (Phase 8) — breadcrumb opsional + judul + deskripsi + actions.
// crumbs: [{ label, to }]  (item terakhir = halaman aktif, tanpa link)
export default function PageHeader({ title, description, crumbs, actions }) {
  return (
    <div className="mb-5">
      {crumbs?.length > 0 && (
        <nav className="mb-2 flex items-center gap-1 text-[13px] text-fg-faint">
          {crumbs.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5" />}
              {c.to ? (
                <Link to={c.to} className="hover:text-fg">{c.label}</Link>
              ) : (
                <span className="text-fg-muted">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-medium text-fg">{title}</h1>
          {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
