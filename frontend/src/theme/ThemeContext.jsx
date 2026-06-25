// src/theme/ThemeContext.jsx
// Tema light/dark/system. Pilihan disimpan di localStorage ('cc-theme').
// Kelas `.dark` ditempel ke <html> (Tailwind darkMode:'class').
import { createContext, useContext, useEffect, useState, useCallback } from "react";

const KEY = "cc-theme";
const ThemeCtx = createContext(null);
export const useTheme = () => useContext(ThemeCtx);

const systemDark = () => window.matchMedia("(prefers-color-scheme: dark)").matches;
function resolve(pref) {
  return pref === "system" ? (systemDark() ? "dark" : "light") : pref;
}
function apply(pref) {
  document.documentElement.classList.toggle("dark", resolve(pref) === "dark");
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => localStorage.getItem(KEY) || "system");

  useEffect(() => {
    apply(theme);
    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const onChange = () => apply("system");
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }
  }, [theme]);

  const setTheme = useCallback((next) => {
    setThemeState(next);
    if (next === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, next);
  }, []);

  // Toggle cepat: light <-> dark (mengabaikan 'system' agar 1 klik langsung berubah).
  const toggle = useCallback(() => {
    setTheme(resolve(theme) === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return (
    <ThemeCtx.Provider value={{ theme, resolved: resolve(theme), setTheme, toggle }}>
      {children}
    </ThemeCtx.Provider>
  );
}
