import Spinner from "./Spinner";

// Tombol reusable dengan dukungan loading state & beberapa varian.
export default function Button({
  children,
  loading = false,
  disabled = false,
  variant = "primary",
  type = "button",
  className = "",
  ...props
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-brand-600 text-white hover:bg-brand-700 focus:ring-brand-500 shadow-sm",
    secondary:
      "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-400",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100 focus:ring-slate-300",
  };

  return (
    <button
      type={type}
      disabled={loading || disabled}
      className={`${base} ${variants[variant]} ${className}`}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}
