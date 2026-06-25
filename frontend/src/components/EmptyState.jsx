// Empty state (Phase 8) — ikon + judul + deskripsi + aksi opsional.
export default function EmptyState({ icon: Icon, title, description, action, className = "" }) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-12 text-center ${className}`}>
      {Icon && (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-surface-hover text-fg-faint">
          <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden="true" />
        </div>
      )}
      {title && <p className="text-sm font-medium text-fg">{title}</p>}
      {description && <p className="mt-1 max-w-sm text-sm text-fg-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
