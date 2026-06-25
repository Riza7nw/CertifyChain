import { useNavigate } from "react-router-dom";
import { Menu as MenuIcon, Search } from "lucide-react";
import IconButton from "../IconButton";
import ThemeToggle from "../ThemeToggle";

// Topbar aplikasi (Phase 8): tombol menu (mobile) + pencarian (⌘K) + tema.
export default function Topbar({ onMenu }) {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-line bg-app/80 px-3 backdrop-blur sm:px-4">
      <div className="lg:hidden">
        <IconButton icon={MenuIcon} label="Buka menu" onClick={onMenu} />
      </div>

      <button
        type="button"
        onClick={() => navigate("/search")}
        className="flex h-9 max-w-md flex-1 items-center gap-2 rounded-lg border border-line bg-surface px-3 text-[13px] text-fg-faint transition-colors hover:bg-surface-hover"
      >
        <Search className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        <span className="flex-1 text-left">Cari sertifikat, ID…</span>
        <kbd className="hidden rounded border border-line-strong px-1.5 text-[11px] font-medium sm:inline">⌘K</kbd>
      </button>

      <div className="flex-1" />
      <ThemeToggle />
    </header>
  );
}
