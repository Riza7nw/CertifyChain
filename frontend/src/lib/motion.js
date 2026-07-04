// Sistem animasi bersama (framer-motion) — Fase A.
// Aturan: hanya animasikan transform & opacity, durasi 150–400ms,
// easing konsisten cubic-bezier(.2,.8,.2,1), hormati prefers-reduced-motion.

export const EASE = [0.2, 0.8, 0.2, 1];

export const DUR = { fast: 0.16, base: 0.25, slow: 0.4 };

// Varian dasar — pakai bersama variants={...} + initial="hidden" animate/whileInView="visible".
export const fadeInUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DUR.base, ease: EASE } },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: { duration: DUR.base, ease: EASE } },
};

// Kontainer stagger — anak memakai varian di atas (fadeInUp/scaleIn).
export const stagger = (staggerChildren = 0.06, delayChildren = 0) => ({
  hidden: {},
  visible: { transition: { staggerChildren, delayChildren } },
});

// Preset viewport: animasi masuk hanya sekali, sedikit sebelum benar-benar terlihat.
export const viewportOnce = { once: true, margin: "0px 0px -60px 0px" };

// Spring untuk elemen "pop" (dialog, kartu hasil, QR).
export const springPop = { type: "spring", stiffness: 380, damping: 30, mass: 0.9 };
