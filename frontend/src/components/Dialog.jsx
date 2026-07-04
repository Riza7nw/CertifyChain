import { useEffect } from "react";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { springPop } from "../lib/motion";

// Modal/dialog dasar (Phase 8 / Fase 2). Overlay + panel terpusat, Esc untuk tutup.
// Fase C: muncul dengan spring scale+fade via AnimatePresence.
export default function Dialog({ open, onClose, title, description, children, footer, maxWidth = "max-w-md" }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence mode="wait">
      {open && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/45 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: springPop }}
            exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.12 } }}
            className={`relative w-full ${maxWidth} rounded-2xl border border-line bg-surface shadow-pop`}
          >
            <div className="flex items-start justify-between gap-4 px-5 pt-5">
              <div>
                {title && <h2 className="text-base font-medium text-fg">{title}</h2>}
                {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
              </div>
              <button onClick={onClose} aria-label="Tutup" className="rounded-md p-1 text-fg-faint hover:bg-surface-hover hover:text-fg">
                <X className="h-5 w-5" />
              </button>
            </div>
            {children && <div className="px-5 py-4">{children}</div>}
            {footer && <div className="flex justify-end gap-2 border-t border-line px-5 py-3.5">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
