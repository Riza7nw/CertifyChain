import { createContext, useContext, useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from "lucide-react";
import { EASE } from "../lib/motion";

// Toast transient (Phase 8 / Fase 2). useToast() -> { toast, success, error, info }.
const ToastCtx = createContext(null);
export const useToast = () => useContext(ToastCtx);

const ICONS = { success: CheckCircle2, error: XCircle, warning: AlertTriangle, info: Info };
const TONE = {
  success: "text-success-fg",
  error: "text-danger-fg",
  warning: "text-warning-fg",
  info: "text-info-fg",
};

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);

  const remove = useCallback((id) => setItems((xs) => xs.filter((x) => x.id !== id)), []);

  const toast = useCallback(
    ({ title, description, tone = "info", duration = 3500 }) => {
      const id = Math.random().toString(36).slice(2);
      setItems((xs) => [...xs, { id, title, description, tone }]);
      if (duration) setTimeout(() => remove(id), duration);
      return id;
    },
    [remove]
  );

  const api = {
    toast,
    success: (title, description) => toast({ title, description, tone: "success" }),
    error: (title, description) => toast({ title, description, tone: "error", duration: 5000 }),
    info: (title, description) => toast({ title, description, tone: "info" }),
  };

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(92vw,360px)] flex-col gap-2">
        <AnimatePresence mode="popLayout">
        {items.map((t) => {
          const Icon = ICONS[t.tone] || Info;
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 24, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="pointer-events-auto flex items-start gap-3 rounded-xl border border-line bg-surface px-3.5 py-3 shadow-pop"
            >
              <Icon className={`mt-0.5 h-[18px] w-[18px] flex-shrink-0 ${TONE[t.tone]}`} strokeWidth={2} />
              <div className="min-w-0 flex-1">
                {t.title && <p className="text-sm font-medium text-fg">{t.title}</p>}
                {t.description && <p className="mt-0.5 text-[13px] text-fg-muted">{t.description}</p>}
              </div>
              <button
                onClick={() => remove(t.id)}
                aria-label="Tutup"
                className="rounded-md p-0.5 text-fg-faint hover:bg-surface-hover hover:text-fg"
              >
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          );
        })}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}
