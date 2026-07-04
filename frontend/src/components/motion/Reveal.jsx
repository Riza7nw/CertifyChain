import { motion, useReducedMotion } from "framer-motion";
import { EASE } from "../../lib/motion";

// Reveal saat elemen masuk viewport (sekali saja).
// Reduced motion -> konten langsung tampil tanpa pergeseran.
export default function Reveal({ children, delay = 0, y = 14, className = "", once = true }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: "0px 0px -60px 0px" }}
      transition={{ duration: reduce ? 0 : 0.4, ease: EASE, delay: reduce ? 0 : delay }}
    >
      {children}
    </motion.div>
  );
}
