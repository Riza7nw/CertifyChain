import { useState, useRef, useEffect } from "react";

// Popover menu ringan (Phase 8). Klik-luar / Esc untuk menutup.
export default function Menu({ trigger, children, align = "left", width = "min-w-[220px]", className = "" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="block w-full text-left">
        {typeof trigger === "function" ? trigger(open) : trigger}
      </button>
      {open && (
        <div
          onClick={() => setOpen(false)}
          className={`absolute z-40 mt-1.5 ${width} overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-pop animate-scale-in ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function MenuItem({ icon: Icon, children, onClick, danger = false, active = false, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
        danger
          ? "text-danger-fg hover:bg-danger-subtle"
          : active
          ? "bg-brand-subtle text-brand-subtle-fg"
          : "text-fg-muted hover:bg-surface-hover hover:text-fg"
      } ${className}`}
    >
      {Icon && <Icon className="h-[18px] w-[18px] flex-shrink-0" strokeWidth={2} aria-hidden="true" />}
      <span className="flex-1 truncate text-left">{children}</span>
    </button>
  );
}

export function MenuLabel({ children }) {
  return <p className="px-2.5 pb-1 pt-2 text-xs text-fg-faint">{children}</p>;
}

export function MenuDivider() {
  return <div className="my-1 border-t border-line" />;
}
