// Avatar inisial (Phase 8). Untuk user/org. `square` untuk logo organisasi.
function initials(name = "") {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const SIZES = { sm: "h-7 w-7 text-[11px]", md: "h-9 w-9 text-xs", lg: "h-11 w-11 text-sm" };

export default function Avatar({ name, size = "md", square = false, brand = false, className = "" }) {
  const tone = brand ? "bg-brand text-brand-fg" : "bg-brand-subtle text-brand-subtle-fg";
  return (
    <span
      className={`inline-flex flex-shrink-0 items-center justify-center font-medium ${SIZES[size]} ${
        square ? "rounded-lg" : "rounded-full"
      } ${tone} ${className}`}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
