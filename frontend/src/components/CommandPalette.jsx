import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Building2, ScrollText, QrCode, Users, ListChecks, BadgeCheck, CornerDownLeft } from "lucide-react";
import { springPop } from "../lib/motion";
import { useAuth } from "../auth/AuthContext";
import { isBytes32 } from "../utils/qr";

// Command palette ⌘K (Phase 8 / Fase 2): navigasi cepat + verifikasi by Certificate ID.
export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const { isPlatformAdmin } = useAuth();
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  const nav = useMemo(() => {
    const items = [
      { icon: Building2, label: "Organisasi", to: "/orgs" },
      { icon: ScrollText, label: "Sertifikat saya", to: "/me/certificates" },
      { icon: QrCode, label: "Scan QR", to: "/scan" },
      { icon: Search, label: "Cari sertifikat publik", to: "/search" },
    ];
    if (isPlatformAdmin)
      items.push(
        { icon: Users, label: "Kelola pengguna", to: "/admin/users" },
        { icon: ListChecks, label: "Semua sertifikat", to: "/admin/certificates" }
      );
    return items;
  }, [isPlatformAdmin]);

  const results = useMemo(() => {
    const t = q.trim();
    const list = [];
    if (isBytes32(t)) list.push({ icon: BadgeCheck, label: `Verifikasi sertifikat ${t.slice(0, 10)}…`, to: `/verify/${t}` });
    const ql = t.toLowerCase();
    nav.filter((n) => !ql || n.label.toLowerCase().includes(ql)).forEach((n) => list.push(n));
    return list;
  }, [q, nav]);

  useEffect(() => {
    if (open) {
      setQ("");
      setActive(0);
      const id = setTimeout(() => inputRef.current?.focus(), 10);
      return () => clearTimeout(id);
    }
  }, [open]);
  useEffect(() => setActive(0), [q]);

  const go = (item) => {
    onClose();
    navigate(item.to);
  };

  function onKey(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); results[active] && go(results[active]); }
    else if (e.key === "Escape") onClose();
  }

  return (
    <AnimatePresence mode="wait">
      {open && (
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[12vh]">
      <motion.div
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0, transition: springPop }}
        exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.12 } }}
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-surface shadow-pop"
      >
        <div className="flex items-center gap-2.5 border-b border-line px-4">
          <Search className="h-4 w-4 flex-shrink-0 text-fg-faint" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="Cari halaman atau tempel Certificate ID…"
            className="h-12 w-full bg-transparent text-sm text-fg placeholder-fg-faint focus:outline-none"
          />
        </div>
        <div className="max-h-80 overflow-y-auto p-1.5">
          {results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-fg-faint">Tidak ada hasil.</p>
          ) : (
            results.map((item, i) => {
              const Icon = item.icon;
              return (
                <button
                  key={i}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(item)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
                    i === active ? "bg-brand-subtle text-brand-subtle-fg" : "text-fg-muted"
                  }`}
                >
                  <Icon className="h-[18px] w-[18px] flex-shrink-0" strokeWidth={2} aria-hidden="true" />
                  <span className="flex-1 truncate text-left">{item.label}</span>
                  {i === active && <CornerDownLeft className="h-4 w-4 flex-shrink-0 opacity-60" />}
                </button>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
      )}
    </AnimatePresence>
  );
}
