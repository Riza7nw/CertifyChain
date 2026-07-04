import { motion } from "framer-motion";
import { EASE } from "../../lib/motion";

// Ikon centang yang "ter-draw" (pathLength 0→1) untuk verdict sukses.
export default function DrawnCheck({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <motion.path
        d="M4.5 12.5l5 5L19.5 6.5"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.15 }}
      />
    </svg>
  );
}
