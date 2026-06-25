/** @type {import('tailwindcss').Config} */
// Phase 8 redesign — token-based theme (light + dark). Warna semantik dipetakan ke
// CSS variables (lihat src/index.css) supaya 1 set utilitas otomatis adaptif tema.
// Aksen brand = violet (Linear-ish), skala penuh 50–950.
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Permukaan & teks (adaptif via CSS var)
        app: "var(--bg)",
        panel: "var(--bg-subtle)",
        surface: { DEFAULT: "var(--surface)", hover: "var(--surface-hover)" },
        line: { DEFAULT: "var(--border)", strong: "var(--border-strong)" },
        fg: { DEFAULT: "var(--text)", muted: "var(--text-muted)", faint: "var(--text-faint)" },
        // Aksen brand (violet) — skala tetap + alias semantik adaptif
        brand: {
          DEFAULT: "var(--brand)",
          hover: "var(--brand-hover)",
          fg: "var(--brand-fg)",
          subtle: "var(--brand-subtle)",
          "subtle-fg": "var(--brand-subtle-fg)",
          50: "#F3F3FF",
          100: "#E9E8FE",
          200: "#D6D3FC",
          300: "#B9B4F9",
          400: "#968DF3",
          500: "#7568EA",
          600: "#5E4FDB",
          700: "#4E3FC0",
          800: "#41359B",
          900: "#38317B",
          950: "#221D48",
        },
        // Status (adaptif)
        success: { DEFAULT: "var(--success)", subtle: "var(--success-subtle)", fg: "var(--success-fg)" },
        warning: { DEFAULT: "var(--warning)", subtle: "var(--warning-subtle)", fg: "var(--warning-fg)" },
        danger: { DEFAULT: "var(--danger)", subtle: "var(--danger-subtle)", fg: "var(--danger-fg)" },
        info: { DEFAULT: "var(--info)", subtle: "var(--info-subtle)", fg: "var(--info-fg)" },
        focusring: "var(--ring)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "JetBrains Mono", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        xs: "0 1px 2px rgba(16,18,27,0.04)",
        sm: "0 1px 3px rgba(16,18,27,0.06), 0 1px 2px rgba(16,18,27,0.04)",
        md: "0 4px 14px rgba(16,18,27,0.08)",
        lg: "0 10px 30px rgba(16,18,27,0.12)",
        pop: "0 8px 24px rgba(16,18,27,0.16)",
      },
      keyframes: {
        "fade-in": { from: { opacity: 0, transform: "translateY(6px)" }, to: { opacity: 1, transform: "translateY(0)" } },
        "scale-in": { from: { opacity: 0, transform: "scale(0.97)" }, to: { opacity: 1, transform: "scale(1)" } },
        shimmer: { "100%": { transform: "translateX(100%)" } },
      },
      animation: {
        "fade-in": "fade-in 0.25s cubic-bezier(.2,.8,.2,1)",
        "scale-in": "scale-in 0.16s cubic-bezier(.2,.8,.2,1)",
      },
    },
  },
  plugins: [],
};
