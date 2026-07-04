import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  FileSearch,
  FileSignature,
  LayoutTemplate,
  Menu as MenuIcon,
  QrCode,
  ScanLine,
  ScrollText,
  Search,
  Share2,
  ShieldCheck,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { useAuth } from "../auth/AuthContext";
import ThemeToggle from "../components/ThemeToggle";
import Reveal from "../components/motion/Reveal";
import AnimatedNumber from "../components/motion/AnimatedNumber";
import { EASE, fadeInUp, stagger, viewportOnce } from "../lib/motion";

/* ============================================================
   Landing page publik (Fase B) — full-bleed, tanpa PublicShell.
   Semua warna dari token tema; aman light + dark.
   ============================================================ */

// Gaya tombol versi <Link> — selaras varian komponen Button.
const BTN_BASE =
  "inline-flex items-center justify-center gap-2 font-medium transition-colors select-none " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focusring focus-visible:ring-offset-2 focus-visible:ring-offset-app";
const BTN_PRIMARY = `${BTN_BASE} h-11 rounded-xl bg-brand px-5 text-sm text-brand-fg shadow-xs hover:bg-brand-hover`;
const BTN_SECONDARY = `${BTN_BASE} h-11 rounded-xl border border-line-strong bg-surface px-5 text-sm text-fg hover:bg-surface-hover`;
const BTN_PRIMARY_SM = `${BTN_BASE} h-9 rounded-lg bg-brand px-3.5 text-sm text-brand-fg shadow-xs hover:bg-brand-hover`;
const BTN_GHOST_SM = `${BTN_BASE} h-9 rounded-lg px-3 text-sm text-fg-muted hover:bg-surface-hover hover:text-fg`;

const NAV_LINKS = [
  { href: "#fitur", label: "Fitur" },
  { href: "#cara-kerja", label: "Cara kerja" },
  { href: "#verifikasi", label: "Verifikasi" },
];

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Anti-pemalsuan on-chain",
    desc: "Sidik jari (hash) setiap sertifikat dicatat permanen di blockchain — tidak bisa diubah atau dihapus oleh siapa pun.",
  },
  {
    icon: FileSignature,
    title: "PDF ber-tanda tangan digital",
    desc: "Setiap PDF ditandatangani dengan standar PAdES sehingga keabsahannya terbaca langsung di pembaca PDF.",
  },
  {
    icon: QrCode,
    title: "Verifikasi QR instan",
    desc: "Pindai QR pada sertifikat dan lihat status keasliannya dalam hitungan detik — tanpa perlu akun.",
  },
  {
    icon: Building2,
    title: "Multi-institusi",
    desc: "Satu platform untuk banyak organisasi: kampus, lembaga pelatihan, hingga penyelenggara sertifikasi.",
  },
  {
    icon: LayoutTemplate,
    title: "Template ber-branding",
    desc: "Atur logo, warna, dan tata letak sertifikat sesuai identitas visual institusi Anda.",
  },
  {
    icon: FileSearch,
    title: "Deteksi file diubah",
    desc: "Unggah PDF untuk mengecek apakah isinya masih identik dengan yang diterbitkan — perubahan sekecil apa pun terdeteksi.",
  },
];

const STEPS = [
  {
    icon: ScrollText,
    title: "Terbitkan",
    desc: "Institusi menerbitkan sertifikat; hash-nya dicatat on-chain dan PDF ditandatangani otomatis.",
  },
  {
    icon: Share2,
    title: "Bagikan QR",
    desc: "Penerima mendapat sertifikat ber-QR yang siap dibagikan ke perusahaan atau media sosial.",
  },
  {
    icon: BadgeCheck,
    title: "Verifikasi",
    desc: "Siapa pun memindai QR atau mengunggah file — keaslian terbukti dalam hitungan detik.",
  },
];

// Fallback statis bila backend tidak menyala.
const FALLBACK_TOTALS = { certificates: 1250, institutions: 12, verifications: 4800 };

// Partikel lembut di latar hero (mati saat reduced motion via motion-reduce:hidden).
const PARTICLES = [
  { left: "8%", top: "24%", size: 5, delay: "0s", dur: "7s" },
  { left: "16%", top: "62%", size: 4, delay: "-2s", dur: "9s" },
  { left: "30%", top: "18%", size: 3, delay: "-4s", dur: "8s" },
  { left: "44%", top: "70%", size: 5, delay: "-1s", dur: "10s" },
  { left: "58%", top: "12%", size: 4, delay: "-5s", dur: "7.5s" },
  { left: "72%", top: "58%", size: 3, delay: "-3s", dur: "9.5s" },
  { left: "86%", top: "30%", size: 5, delay: "-6s", dur: "8.5s" },
  { left: "93%", top: "66%", size: 4, delay: "-2.5s", dur: "7s" },
];

/* ---------- QR dekoratif (bukan QR asli) — pola deterministik ---------- */
const QR_SIZE = 21;
const QR_UNIT = 4;
const QR_CELLS = (() => {
  let seed = 42;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  const inFinder = (r, c) =>
    (r < 7 && c < 7) || (r < 7 && c >= QR_SIZE - 7) || (r >= QR_SIZE - 7 && c < 7);
  const cells = [];
  for (let r = 0; r < QR_SIZE; r++) {
    for (let c = 0; c < QR_SIZE; c++) {
      if (!inFinder(r, c) && rnd() > 0.55) cells.push([r, c]);
    }
  }
  return cells;
})();

function QrMock({ className = "" }) {
  const s = QR_UNIT;
  const finder = (fx, fy) => (
    <g key={`${fx}-${fy}`}>
      <rect x={fx} y={fy} width={7 * s} height={7 * s} fill="currentColor" />
      <rect x={fx + s} y={fy + s} width={5 * s} height={5 * s} fill="var(--surface)" />
      <rect x={fx + 2 * s} y={fy + 2 * s} width={3 * s} height={3 * s} fill="currentColor" />
    </g>
  );
  return (
    <svg viewBox={`0 0 ${QR_SIZE * s} ${QR_SIZE * s}`} className={className} aria-hidden="true">
      {finder(0, 0)}
      {finder((QR_SIZE - 7) * s, 0)}
      {finder(0, (QR_SIZE - 7) * s)}
      {QR_CELLS.map(([r, c]) => (
        <rect key={`${r}-${c}`} x={c * s + 0.3} y={r * s + 0.3} width={s - 0.6} height={s - 0.6} rx={0.8} fill="currentColor" />
      ))}
    </svg>
  );
}

/* ---------- Latar hero: aurora violet + grid halus + partikel ---------- */
function AuroraBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="landing-grid absolute inset-0" />
      <div className="absolute -top-40 left-1/2 h-[26rem] w-[46rem] -translate-x-1/2 animate-aurora-a rounded-full bg-brand-500/20 blur-3xl motion-reduce:animate-none" />
      <div className="absolute right-[4%] top-24 h-72 w-72 animate-aurora-b rounded-full bg-brand-300/20 blur-3xl motion-reduce:animate-none" />
      <div
        className="absolute left-[2%] top-72 h-64 w-64 animate-aurora-b rounded-full bg-brand-400/15 blur-3xl motion-reduce:animate-none"
        style={{ animationDelay: "-7s" }}
      />
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="absolute animate-float rounded-full bg-brand-400/40 motion-reduce:hidden"
          style={{ left: p.left, top: p.top, width: p.size, height: p.size, animationDelay: p.delay, animationDuration: p.dur }}
        />
      ))}
    </div>
  );
}

/* ---------- Kartu sertifikat 3D-tilt (visual hero) ---------- */
function CertificateArt() {
  return (
    <div
      className="relative w-full rounded-2xl border border-line bg-surface p-6 shadow-lg"
      style={{ transformStyle: "preserve-3d" }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-sm font-semibold text-brand-fg">UN</span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-fg">Universitas Nusantara</p>
            <p className="text-[11px] text-fg-faint">Penerbit terverifikasi</p>
          </div>
        </div>
        <span className="rounded-md border border-line px-1.5 py-0.5 font-mono text-[10px] text-fg-faint">PAdES ✓</span>
      </div>

      <div className="mt-6">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-fg-faint">Sertifikat kelulusan</p>
        <p className="mt-1.5 text-xl font-semibold tracking-tight text-fg">Rizky Ananda Putra</p>
        <p className="mt-0.5 text-sm text-fg-muted">Sarjana Teknik Informatika · Cum Laude</p>
      </div>

      <div className="mt-6 flex items-end justify-between gap-4 border-t border-line pt-4">
        <div className="min-w-0">
          <p className="font-mono text-[11px] text-fg-faint">ID Sertifikat</p>
          <p className="mt-1 truncate font-mono text-xs text-fg">0x7f3a91c4…d20e9c2e</p>
          <p className="mt-2 text-[11px] text-fg-faint">Diterbitkan 12 Mei 2026</p>
        </div>
        <QrMock className="h-20 w-20 flex-shrink-0 text-fg" />
      </div>

      {/* Badge status melayang — depth via translateZ */}
      <div className="absolute -right-3 -top-3" style={{ transform: "translateZ(48px)" }}>
        <div className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 shadow-md">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          <span className="text-xs font-medium text-success-fg">Tercatat on-chain</span>
        </div>
      </div>
      <div className="absolute -bottom-3.5 left-5" style={{ transform: "translateZ(36px)" }}>
        <div className="animate-float motion-reduce:animate-none" style={{ animationDuration: "9s" }}>
          <div className="flex items-center gap-1.5 rounded-lg border border-line bg-panel px-2.5 py-1.5 shadow-md">
            <ShieldCheck className="h-3.5 w-3.5 text-brand" strokeWidth={2.2} />
            <span className="font-mono text-[10px] text-fg-muted">SHA3-256 · cocok</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TiltCertificate() {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(my, [0, 1], [8, -8]), { stiffness: 220, damping: 26 });
  const rotateY = useSpring(useTransform(mx, [0, 1], [-10, 10]), { stiffness: 220, damping: 26 });

  function onMove(e) {
    const b = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - b.left) / b.width);
    my.set((e.clientY - b.top) / b.height);
  }
  function onLeave() {
    mx.set(0.5);
    my.set(0.5);
  }

  if (reduce) {
    return (
      <div className="w-[min(100%,26rem)]">
        <CertificateArt />
      </div>
    );
  }
  return (
    <div className="w-[min(100%,26rem)]" style={{ perspective: 1100 }} onMouseMove={onMove} onMouseLeave={onLeave}>
      <motion.div style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}>
        <CertificateArt />
      </motion.div>
    </div>
  );
}

/* ---------- Navbar sticky glassmorphism ---------- */
function LandingNav() {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-line bg-app/70 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5" aria-label="CertifyChain — beranda">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-fg">
            <BadgeCheck className="h-[18px] w-[18px]" strokeWidth={2.2} />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-fg">CertifyChain</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} className="rounded-lg px-3 py-1.5 text-sm font-medium text-fg-muted hover:bg-surface-hover hover:text-fg">
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          {isAuthenticated ? (
            <Link to="/orgs" className={BTN_PRIMARY_SM}>
              Buka Dashboard
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Link>
          ) : (
            <>
              <Link to="/login" className={`${BTN_GHOST_SM} hidden sm:inline-flex`}>
                Masuk
              </Link>
              <Link to="/register" className={BTN_PRIMARY_SM}>
                Daftar
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Tutup menu" : "Buka menu"}
            aria-expanded={open}
            className="rounded-lg p-2 text-fg-muted hover:bg-surface-hover hover:text-fg md:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      <AnimatePresence mode="wait">
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: EASE }}
            className="border-t border-line px-4 pb-3 pt-2 md:hidden"
          >
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-fg-muted hover:bg-surface-hover hover:text-fg"
              >
                {l.label}
              </a>
            ))}
            {!isAuthenticated && (
              <Link to="/login" className="block rounded-lg px-3 py-2 text-sm font-medium text-fg-muted hover:bg-surface-hover hover:text-fg sm:hidden">
                Masuk
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

/* ---------- Hero ---------- */
function Hero() {
  return (
    <section className="relative overflow-hidden pb-20 pt-28 sm:pt-36 lg:pb-28">
      <AuroraBackdrop />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr]">
        <motion.div variants={stagger(0.09)} initial="hidden" animate="visible">
          <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 shadow-xs">
            <ShieldCheck className="h-3.5 w-3.5 text-brand" strokeWidth={2.2} />
            <span className="text-xs font-medium text-fg-muted">Anti-pemalsuan berbasis blockchain</span>
          </motion.div>

          <motion.h1
            variants={fadeInUp}
            className="mt-5 text-4xl font-semibold leading-[1.08] tracking-tight text-fg sm:text-5xl lg:text-[3.4rem]"
          >
            Sertifikat digital yang <span className="text-brand">keasliannya bisa dibuktikan</span>.
          </motion.h1>

          <motion.p variants={fadeInUp} className="mt-5 max-w-xl text-base leading-relaxed text-fg-muted sm:text-lg">
            CertifyChain membantu institusi menerbitkan sertifikat ber-QR yang sidik jarinya tercatat permanen di
            blockchain — siapa pun dapat memverifikasi keasliannya dalam hitungan detik, tanpa menghubungi penerbit.
          </motion.p>

          <motion.div variants={fadeInUp} className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/register" className={BTN_PRIMARY}>
              Daftar Institusi
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Link>
            <Link to="/verify-file" className={BTN_SECONDARY}>
              <FileSearch className="h-4 w-4" strokeWidth={2} />
              Verifikasi Sertifikat
            </Link>
          </motion.div>

          <motion.p variants={fadeInUp} className="mt-4 text-xs text-fg-faint">
            Verifikasi publik tanpa akun · PDF ber-tanda tangan digital
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: EASE, delay: 0.2 }}
          className="flex justify-center lg:justify-end"
        >
          <TiltCertificate />
        </motion.div>
      </div>
    </section>
  );
}

/* ---------- Trust bar: statistik live + fallback ---------- */
function TrustBar() {
  const [totals, setTotals] = useState(FALLBACK_TOTALS);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/stats", { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        const t = body?.data?.totals;
        if (!t) return;
        setTotals({
          certificates: Number.isFinite(t.certificates) ? t.certificates : FALLBACK_TOTALS.certificates,
          institutions: Number.isFinite(t.institutions) ? t.institutions : FALLBACK_TOTALS.institutions,
          verifications: Number.isFinite(t.verifications) ? t.verifications : FALLBACK_TOTALS.verifications,
        });
      })
      .catch(() => {
        /* backend mati -> tetap pakai fallback */
      });
    return () => ctrl.abort();
  }, []);

  const items = [
    { label: "Sertifikat diterbitkan", value: totals.certificates },
    { label: "Institusi penerbit", value: totals.institutions },
    { label: "Verifikasi dilakukan", value: totals.verifications },
  ];

  return (
    <section className="border-y border-line bg-panel/60">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3 sm:px-6">
        {items.map((it, i) => (
          <Reveal key={it.label} delay={i * 0.08} className="text-center">
            <p className="text-3xl font-semibold tabular-nums tracking-tight text-fg sm:text-4xl">
              <AnimatedNumber value={it.value} />
              <span className="text-brand">+</span>
            </p>
            <p className="mt-1.5 text-sm text-fg-muted">{it.label}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ---------- Fitur ---------- */
function FeatureCard({ icon: Icon, title, desc }) {
  return (
    <motion.div
      variants={fadeInUp}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2, ease: EASE }}
      className="group rounded-xl border border-line bg-surface p-5 shadow-xs transition-[border-color,box-shadow] duration-200 hover:border-brand-400/40 hover:shadow-glow"
    >
      <span className="inline-flex rounded-lg bg-brand-subtle p-2.5 text-brand-subtle-fg">
        <Icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-[15px] font-semibold text-fg">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{desc}</p>
    </motion.div>
  );
}

function Features() {
  return (
    <section id="fitur" className="scroll-mt-24 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-brand">Fitur</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
            Dibangun untuk kepercayaan, dirancang untuk institusi.
          </h2>
          <p className="mt-3 text-fg-muted">
            Dari penerbitan sampai verifikasi, setiap langkah dirancang agar sertifikat Anda tidak bisa dipalsukan.
          </p>
        </Reveal>

        <motion.div
          variants={stagger(0.07)}
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ---------- Cara kerja: 3 langkah berurutan ---------- */
function HowItWorks() {
  return (
    <section id="cara-kerja" className="scroll-mt-24 border-y border-line bg-panel/40 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-brand">Cara kerja</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
            Tiga langkah menuju sertifikat terpercaya.
          </h2>
        </Reveal>

        <div className="relative mt-14">
          {/* Garis penghubung antar langkah (desktop) */}
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={viewportOnce}
            transition={{ duration: 0.7, ease: EASE, delay: 0.25 }}
            className="absolute left-[16%] right-[16%] top-7 hidden h-px origin-left bg-gradient-to-r from-brand-400/60 via-line-strong to-brand-400/60 md:block"
            aria-hidden="true"
          />
          <div className="grid gap-10 md:grid-cols-3 md:gap-8">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <Reveal key={s.title} delay={i * 0.15} className="relative text-center">
                  <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-line bg-surface shadow-sm">
                    <Icon className="h-6 w-6 text-brand" strokeWidth={2} aria-hidden="true" />
                  </div>
                  <p className="mt-4 font-mono text-[11px] tracking-[0.2em] text-fg-faint">{`0${i + 1}`}</p>
                  <h3 className="mt-1 text-lg font-semibold text-fg">{s.title}</h3>
                  <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-fg-muted">{s.desc}</p>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Demo verifikasi ---------- */
function DemoCard({ to, icon: Icon, title, desc, cta }) {
  return (
    <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.2, ease: EASE }} className="h-full">
      <Link
        to={to}
        className="group flex h-full flex-col rounded-2xl border border-line bg-surface p-6 shadow-xs transition-[border-color,box-shadow] duration-200 hover:border-brand-400/40 hover:shadow-glow"
      >
        <span className="inline-flex w-fit rounded-xl bg-brand-subtle p-3 text-brand-subtle-fg">
          <Icon className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
        </span>
        <h3 className="mt-4 text-lg font-semibold text-fg">{title}</h3>
        <p className="mt-1.5 flex-1 text-sm leading-relaxed text-fg-muted">{desc}</p>
        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand">
          {cta}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
        </span>
      </Link>
    </motion.div>
  );
}

function VerifyDemo() {
  return (
    <section id="verifikasi" className="scroll-mt-24 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-brand">Coba sekarang</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
            Verifikasi tanpa akun, langsung dari browser.
          </h2>
        </Reveal>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <Reveal>
            <DemoCard
              to="/search"
              icon={Search}
              title="Cari sertifikat"
              desc="Masukkan nama penerima atau ID sertifikat untuk menemukannya, lalu lihat status keasliannya."
              cta="Buka pencarian"
            />
          </Reveal>
          <Reveal delay={0.08}>
            <DemoCard
              to="/scan"
              icon={ScanLine}
              title="Scan QR"
              desc="Gunakan kamera untuk memindai QR pada sertifikat cetak maupun digital."
              cta="Buka pemindai"
            />
          </Reveal>
        </div>

        <Reveal delay={0.12} className="mt-6 text-center text-sm text-fg-muted">
          Punya file PDF-nya?{" "}
          <Link to="/verify-file" className="font-medium text-brand hover:underline">
            Verifikasi langsung dari file →
          </Link>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- CTA akhir + footer ---------- */
function FinalCta() {
  return (
    <section className="px-4 pb-20 sm:px-6 sm:pb-24">
      <Reveal className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl border border-line bg-panel px-6 py-16 text-center sm:py-20">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -top-24 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-brand-500/15 blur-3xl" />
        </div>
        <div className="relative">
          <h2 className="mx-auto max-w-2xl text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
            Mulai terbitkan sertifikat yang tidak bisa dipalsukan.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-fg-muted">
            Daftarkan institusi Anda dan terbitkan sertifikat terverifikasi on-chain dalam hitungan menit.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/register" className={BTN_PRIMARY}>
              Daftar Institusi
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Link>
            <Link to="/login" className={BTN_SECONDARY}>
              Masuk ke dashboard
            </Link>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="border-t border-line bg-panel/40">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-fg">
              <BadgeCheck className="h-[18px] w-[18px]" strokeWidth={2.2} />
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-fg">CertifyChain</span>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-fg-muted">
            Platform penerbitan dan verifikasi sertifikat digital berbasis blockchain untuk institusi Indonesia.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold text-fg">Verifikasi</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/search" className="text-fg-muted hover:text-fg">Cari sertifikat</Link></li>
            <li><Link to="/scan" className="text-fg-muted hover:text-fg">Scan QR</Link></li>
            <li><Link to="/verify-file" className="text-fg-muted hover:text-fg">Verifikasi by-file</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-fg">Akun</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/login" className="text-fg-muted hover:text-fg">Masuk</Link></li>
            <li><Link to="/register" className="text-fg-muted hover:text-fg">Daftar institusi</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line py-5 text-center text-xs text-fg-faint">
        © {new Date().getFullYear()} CertifyChain — Diverifikasi langsung dari blockchain.
      </div>
    </footer>
  );
}

/* ---------- Halaman ---------- */
export default function Landing() {
  return (
    <div className="min-h-screen bg-app text-fg">
      <LandingNav />
      <main>
        <Hero />
        <TrustBar />
        <Features />
        <HowItWorks />
        <VerifyDemo />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
