// Kartu permukaan (Phase 8) — token-based. Header opsional (title/description/action) + footer.
export default function Card({ title, description, action, children, className = "", bodyClassName = "px-5 py-4", footer }) {
  return (
    <section className={`rounded-xl border border-line bg-surface shadow-xs ${className}`}>
      {(title || description || action) && (
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-3.5">
          <div>
            {title && <h2 className="text-[15px] font-medium text-fg">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-fg-muted">{description}</p>}
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
      {footer && <footer className="border-t border-line px-5 py-3.5">{footer}</footer>}
    </section>
  );
}
