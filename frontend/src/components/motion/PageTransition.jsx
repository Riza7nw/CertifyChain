import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { EASE } from "../../lib/motion";

// Transisi antar rute (dipakai di shell): fade + slide halus.
// initial={false} -> muat pertama tanpa animasi (paint cepat); pindah rute beranimasi.
// Reduced motion -> fade saja tanpa pergeseran.
export default function PageTransition({ children, className = "" }) {
  const location = useLocation();
  const reduce = useReducedMotion();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        className={className}
        initial={{ opacity: 0, y: reduce ? 0 : 8 }}
        animate={{ opacity: 1, y: 0, transition: { duration: 0.22, ease: EASE } }}
        exit={{ opacity: 0, y: reduce ? 0 : -4, transition: { duration: 0.12, ease: EASE } }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
