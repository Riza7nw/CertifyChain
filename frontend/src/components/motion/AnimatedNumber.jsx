import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";
import { EASE } from "../../lib/motion";

const formatId = (n) => Math.round(n).toLocaleString("id-ID");

// Counter angka beranimasi saat masuk viewport (sekali).
// Bila value berubah (mis. data live tiba), lanjut dari angka terakhir — bukan dari 0.
export default function AnimatedNumber({ value, duration = 1.1, format = formatId, className = "" }) {
  const ref = useRef(null);
  const fromRef = useRef(0);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduce = useReducedMotion();
  const [text, setText] = useState(() => format(0));

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      fromRef.current = value;
      setText(format(value));
      return;
    }
    const controls = animate(fromRef.current, value, {
      duration,
      ease: EASE,
      onUpdate: (v) => setText(format(v)),
    });
    fromRef.current = value;
    return () => controls.stop();
    // format sengaja bukan dependency (fungsi inline memicu ulang tiap render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, value, reduce, duration]);

  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  );
}
