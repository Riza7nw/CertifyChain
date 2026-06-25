// Tombol ikon-saja (Phase 8). Wajib `label` untuk aksesibilitas.
export default function IconButton({ icon: Icon, label, className = "", ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-surface-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focusring ${className}`}
      {...props}
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />
    </button>
  );
}
