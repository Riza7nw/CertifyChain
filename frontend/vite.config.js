import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Konfigurasi Vite.
// Proxy /api -> backend Express agar saat development tidak ada masalah CORS
// dan frontend cukup memanggil path relatif "/api/...".
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.VITE_API_TARGET || "http://localhost:3000",
        changeOrigin: true,
      },
      "/health": {
        target: process.env.VITE_API_TARGET || "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
