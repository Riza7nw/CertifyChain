import { Link } from "react-router-dom";
import { BadgeCheck } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import ThemeToggle from "../ThemeToggle";
import { EASE } from "../../lib/motion";

// Layout halaman AUTH (Phase 8): terpusat, branding minimal, toggle tema di pojok.
// Shell ini remount tiap ganti halaman auth -> animasi mount = transisi halaman.
export default function AuthShell({ children }) {
  const reduce = useReducedMotion();
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-app px-4 py-10 text-fg">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, y: reduce ? 0 : 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: EASE }}
      >
        <Link to="/" className="mb-6 flex items-center justify-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-brand-fg">
            <BadgeCheck className="h-5 w-5" strokeWidth={2.2} />
          </span>
          <span className="text-lg font-semibold tracking-tight text-fg">CertifyChain</span>
        </Link>
        {children}
      </motion.div>
    </div>
  );
}
