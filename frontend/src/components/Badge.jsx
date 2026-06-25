// Badge / status pill (Phase 8). Warna semantik adaptif tema.
const TONES = {
  neutral: "bg-surface-hover text-fg-muted",
  brand: "bg-brand-subtle text-brand-subtle-fg",
  success: "bg-success-subtle text-success-fg",
  warning: "bg-warning-subtle text-warning-fg",
  danger: "bg-danger-subtle text-danger-fg",
  info: "bg-info-subtle text-info-fg",
};

export default function Badge({ tone = "neutral", icon: Icon, dot = false, children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone]} ${className}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />}
      {Icon && <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />}
      {children}
    </span>
  );
}
