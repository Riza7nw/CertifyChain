import Spinner from "./Spinner";

// Tombol token-based (Phase 8). Varian + ukuran + ikon + loading.
// Kompatibel mundur: variant primary/secondary/ghost tetap ada.
const VARIANTS = {
  primary: "bg-brand text-brand-fg hover:bg-brand-hover shadow-xs",
  secondary: "bg-surface text-fg border border-line-strong hover:bg-surface-hover",
  ghost: "bg-transparent text-fg-muted hover:bg-surface-hover hover:text-fg",
  destructive: "bg-transparent text-danger-fg border border-line-strong hover:bg-danger-subtle hover:border-danger/40",
  link: "bg-transparent text-brand hover:underline px-0",
};

const SIZES = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-lg",
  md: "h-9 px-3.5 text-sm gap-2 rounded-lg",
  lg: "h-11 px-5 text-sm gap-2 rounded-xl",
};

export default function Button({
  children,
  loading = false,
  disabled = false,
  variant = "primary",
  size = "md",
  type = "button",
  icon: Icon,
  iconRight: IconRight,
  className = "",
  ...props
}) {
  const base =
    "inline-flex items-center justify-center font-medium transition-colors select-none " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focusring focus-visible:ring-offset-2 focus-visible:ring-offset-app " +
    "active:scale-[0.985] disabled:opacity-55 disabled:pointer-events-none";

  return (
    <button
      type={type}
      disabled={loading || disabled}
      className={`${base} ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {loading ? <Spinner className="h-4 w-4" /> : Icon ? <Icon className="h-[1.05em] w-[1.05em]" strokeWidth={2} /> : null}
      {children}
      {IconRight && !loading && <IconRight className="h-[1.05em] w-[1.05em]" strokeWidth={2} />}
    </button>
  );
}
