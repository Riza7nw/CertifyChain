# MISI: Upgrade UI CertifyChain — Interaktif + Animasi + Landing Page

Kamu adalah frontend engineer senior dengan selera desain tinggi (level Linear/Vercel/Stripe).
Semua komunikasi dan laporan WAJIB dalam Bahasa Indonesia penuh.

## KONTEKS PROYEK (fakta — jangan tebak ulang)

- Monorepo: `frontend/` = Vite 5 + React 18 (JSX murni, TANPA TypeScript) + Tailwind CSS 3 + react-router-dom + lucide-react. `backend/` = Express (JANGAN disentuh sama sekali).
- Desain existing (Phase 8): tema token-based di `frontend/tailwind.config.js` + CSS variables di `frontend/src/index.css`. Dark mode via `darkMode: "class"` dengan `ThemeToggle.jsx`. Aksen brand = violet (`brand-600 #5E4FDB`, skala 50–950).
- WAJIB pakai utilitas token yang sudah ada: `bg-app`, `bg-panel`, `bg-surface`, `bg-surface-hover`, `border-line`, `border-line-strong`, `text-fg`, `text-fg-muted`, `text-fg-faint`, `bg-brand`, `text-brand`, `bg-brand-subtle`, `text-brand-subtle-fg`, status `success/warning/danger/info`, `shadow-xs/sm/md/lg/pop`. JANGAN hardcode warna hex baru di komponen.
- Keyframes existing di tailwind.config.js: `fade-in`, `scale-in`, `shimmer` — boleh ditambah, jangan dihapus.
- Shell layout: `src/components/shell/` → `AppShell` (dashboard, sidebar+topbar), `AuthShell` (login/register), `PublicShell` (halaman publik). Komponen UI lengkap di `src/components/` (Button, Card, Badge, StatCard, DataTable, Dialog, Toast, CommandPalette, Skeleton, EmptyState, dll).
- Rute di `src/App.jsx`. Halaman publik: `/login /register /verify-email /scan /search /verify-file /verify/:id`. Protected: `/` (OrgsPage), `/orgs/:orgId`, `/orgs/:orgId/issue`, `/orgs/:orgId/templates`, `/me/certificates`, `/admin/users`, `/admin/certificates`, `/verify`.
- GOTCHA auth: access token disimpan DI MEMORY (AuthContext) — reload penuh memulihkan sesi via cookie refresh, tapi navigasi antarhalaman harus pakai React Router (`<Link>`/`navigate`), BUKAN `window.location`.
- Endpoint publik yang boleh dipakai landing page: `GET /api/stats` (statistik nyata: jumlah sertifikat/institusi/verifikasi). Dev server: Vite proxy `/api` → backend `localhost:3000` (backend mungkin tidak nyala — landing HARUS tetap tampil baik bila fetch gagal; pakai fallback angka statis).

## TUGAS 1 — Landing Page publik (prioritas pertama)

Buat landing page modern satu halaman di rute **`/`** untuk pengunjung yang BELUM login:

- Ubah routing: `/` → `Landing.jsx` (publik, TANPA PublicShell — bikin layout sendiri yang full-bleed). Dashboard organisasi pindah ke `/orgs`. Bila user SUDAH login membuka `/`, tampilkan tombol "Buka Dashboard" di navbar (JANGAN auto-redirect, biarkan mereka lihat landing). Perbaiki semua redirect internal yang menunjuk `/` sebagai dashboard (RequireAuth, Login `from` default, navigate pasca-login/register, link logo di shell, dll) → arahkan ke `/orgs`.
- Struktur section (urut):
  1. **Navbar** sticky glassmorphism (blur + border tipis), logo, link section, ThemeToggle, CTA Masuk/Daftar.
  2. **Hero**: headline besar tentang sertifikat digital anti-pemalsuan berbasis blockchain; sub-headline; 2 CTA (Daftar Institusi → `/register`, Verifikasi Sertifikat → `/verify-file`); visual hero = mockup kartu sertifikat 3D-tilt yang mengikuti kursor + QR + badge "Tercatat on-chain", dengan latar animated gradient mesh/aurora violet + grid halus + partikel lembut.
  3. **Trust bar**: statistik live dari `GET /api/stats` dengan animasi counter saat masuk viewport (fallback statis bila API mati).
  4. **Fitur** (grid kartu dengan ikon lucide, hover lift + glow): Anti-pemalsuan on-chain, PDF ber-tanda-tangan digital PAdES, Verifikasi QR instan, Multi-institusi, Template ber-branding, Verifikasi by-file (deteksi tamper).
  5. **Cara kerja** — 3 langkah (Terbitkan → Bagikan QR → Verifikasi) dengan ilustrasi/diagram beranimasi scroll-reveal berurutan.
  6. **Demo verifikasi** — section interaktif kecil yang mengarahkan ke `/search` dan `/scan`.
  7. **CTA akhir** + **Footer** (link halaman publik, copyright).
- Landing harus responsif penuh (mobile-first), dark + light mode sama bagusnya.

## TUGAS 2 — Upgrade interaktivitas & animasi seluruh app

Pasang **framer-motion** (`npm install framer-motion` di `frontend/`) dan bangun sistem animasi:

- Buat util bersama `src/lib/motion.js` (atau folder `src/components/motion/`): varian reusable (fadeInUp, stagger container, scale-in), komponen `<Reveal>` (whileInView sekali), `<AnimatedNumber>` (counter), `<PageTransition>` (dipakai di shell — fade+slide halus antar rute via `AnimatePresence` + `useLocation`).
- Terapkan bertahap ke app existing (JANGAN mengubah logika/props/perilaku komponen — hanya lapisan presentasi):
  - Transisi antar halaman di AppShell/PublicShell/AuthShell.
  - Stagger reveal untuk daftar kartu (OrgsPage, MyCertificates, OrgDashboard stats, hasil PublicSearch).
  - Micro-interactions: Button (press/hover yang sudah ada dipertahankan, tambah subtle), Card hover lift, StatCard counter beranimasi, Sidebar active-item indicator meluncur (layoutId), Dialog/Confirm/CommandPalette muncul dengan spring scale+fade, Toast slide-in, Skeleton shimmer diperhalus.
  - Halaman IssueCert: state antrian ("Sedang memproses") diberi animasi progres/pulse yang lebih hidup; kartu hasil muncul dengan spring + QR pop-in.
  - VerifyFile/PublicVerify: verdict sukses (checkmark yang ter-draw / confetti ringan sekali) vs gagal (shake halus) — jangan norak.
- ATURAN ANIMASI (wajib): hanya animasikan `transform` & `opacity` (60fps, jangan animate layout/width/height/top); durasi 150–400ms untuk micro, easing `cubic-bezier(.2,.8,.2,1)` konsisten; hormati `prefers-reduced-motion` (semua animasi non-esensial dimatikan — pakai hook `useReducedMotion` dari framer-motion); animasi masuk viewport hanya sekali (`viewport={{ once: true }}`); jangan ada animasi infinite yang mengganggu di area konten utama.

## GUARDRAILS

- JANGAN menyentuh `backend/` atau file `.env` apa pun.
- JANGAN mengubah logika auth, API call, atau alur data — ini murni upgrade presentasi + penambahan landing page + penyesuaian rute `/`→`/orgs`.
- JANGAN commit/push — user commit manual. Di akhir, siapkan teks commit (conventional commits, Bahasa Indonesia).
- JANGAN menambah dependensi selain `framer-motion` tanpa bertanya dulu.
- Pertahankan gaya kode existing: JSX tanpa TypeScript, komentar Bahasa Indonesia singkat, komponen kecil reusable.

## URUTAN KERJA

1. Baca dulu: `src/App.jsx`, `src/index.css`, `tailwind.config.js`, ketiga shell, `Button/Card/StatCard/Skeleton/Toast/Dialog`, `OrgsPage`, `AuthContext.jsx` — pahami pola sebelum menulis.
2. Fase A: install framer-motion + buat `src/lib/motion.js` + PageTransition di shell.
3. Fase B: Landing page lengkap + perombakan rute `/`→`/orgs` (perbaiki SEMUA referensi).
4. Fase C: sebar micro-interactions & animasi ke halaman/komponen existing.
5. Verifikasi (WAJIB sebelum lapor selesai): `npm run build` lolos; jalankan dev server + buka browser sendiri; cek landing (light & dark, mobile & desktop), login → redirect ke `/orgs` benar, navigasi antarhalaman mulus, 0 error console; uji `prefers-reduced-motion`. Tunjukkan bukti (screenshot).
6. Laporkan ringkasan per fase + teks commit per fase (pisahkan commit: `feat(landing)`, `feat(ui)`).

Kerjakan bertahap dan tunjukkan progres tiap fase. Mulai dari langkah 1 sekarang.
