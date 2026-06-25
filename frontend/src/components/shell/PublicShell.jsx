import { Link } from "react-router-dom";
import { BadgeCheck } from "lucide-react";
import ThemeToggle from "../ThemeToggle";

// Layout halaman PUBLIK (Phase 8): header ringan + footer "trust". Tanpa login.
export default function PublicShell({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-app text-fg">
      <header className="sticky top-0 z-20 border-b border-line bg-app/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/verify" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-fg">
              <BadgeCheck className="h-[18px] w-[18px]" strokeWidth={2.2} />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight text-fg">CertifyChain</p>
              <p className="text-[11px] text-fg-faint">Verifikasi publik</p>
            </div>
          </Link>
          <nav className="flex items-center gap-1">
            <Link to="/search" className="rounded-lg px-3 py-1.5 text-sm font-medium text-fg-muted hover:bg-surface-hover hover:text-fg">
              Cari
            </Link>
            <Link to="/scan" className="rounded-lg px-3 py-1.5 text-sm font-medium text-fg-muted hover:bg-surface-hover hover:text-fg">
              Scan QR
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      <main className="flex-1 px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-2xl animate-fade-in">{children}</div>
      </main>

      <footer className="border-t border-line py-4 text-center text-xs text-fg-faint">
        Diverifikasi langsung dari blockchain · CertifyChain
      </footer>
    </div>
  );
}
