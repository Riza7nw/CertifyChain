import { Link } from "react-router-dom";

// Layout untuk halaman PUBLIK (tanpa login, tanpa sidebar dashboard).
// Dipakai oleh halaman scan & halaman hasil verifikasi yang dituju QR.
export default function PublicLayout({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link to="/verify" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">CertifyChain</p>
              <p className="text-xs text-slate-400">Public Verification</p>
            </div>
          </Link>
          <div className="flex items-center gap-1">
            <Link
              to="/search"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-50"
            >
              Cari
            </Link>
            <Link
              to="/scan"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-50"
            >
              Scan QR
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-2xl">{children}</div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        Diverifikasi langsung dari blockchain • CertifyChain
      </footer>
    </div>
  );
}
