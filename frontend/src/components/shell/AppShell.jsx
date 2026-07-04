import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import CommandPalette from "../CommandPalette";
import PageTransition from "../motion/PageTransition";
import { EASE } from "../../lib/motion";

// Kerangka aplikasi (Phase 8): sidebar (desktop) / drawer (mobile) + topbar + konten.
export default function AppShell({ children }) {
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);

  // ⌘K / Ctrl+K → command palette.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex min-h-screen bg-app text-fg">
      <div className="hidden lg:block">
        <div className="sticky top-0 h-screen">
          <Sidebar />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {drawer && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setDrawer(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
            <motion.div
              className="absolute left-0 top-0 h-full"
              initial={{ x: -264, opacity: 0.6 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -264, opacity: 0.6 }}
              transition={{ duration: 0.25, ease: EASE }}
            >
              <Sidebar onNavigate={() => setDrawer(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setDrawer(true)} onSearch={() => setPalette(true)} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <PageTransition className="mx-auto max-w-5xl">{children}</PageTransition>
        </main>
      </div>

      <CommandPalette open={palette} onClose={() => setPalette(false)} />
    </div>
  );
}
