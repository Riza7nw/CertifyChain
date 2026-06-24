// Container kartu ala dashboard SaaS.
export default function Card({ title, description, children, className = "", footer }) {
  return (
    <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {(title || description) && (
        <header className="border-b border-slate-100 px-6 py-4">
          {title && <h2 className="text-base font-semibold text-slate-900">{title}</h2>}
          {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
        </header>
      )}
      <div className="px-6 py-5">{children}</div>
      {footer && <footer className="border-t border-slate-100 px-6 py-4">{footer}</footer>}
    </section>
  );
}
