import { useId } from "react";
import { NavLink, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Building2, ScrollText, QrCode, Search, Users, ListChecks, BadgeCheck } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import WorkspaceSwitcher from "./WorkspaceSwitcher";
import UserMenu from "./UserMenu";

// activeId: layoutId unik per instance Sidebar (desktop + drawer bisa mount bersamaan).
function NavItem({ to, label, icon: Icon, end, onNavigate, activeId }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors ${
          isActive ? "text-brand-subtle-fg" : "text-fg-muted hover:bg-surface-hover hover:text-fg"
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <motion.span
              layoutId={activeId}
              className="absolute inset-0 rounded-lg bg-brand-subtle"
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              aria-hidden="true"
            />
          )}
          <Icon className="relative z-10 h-[18px] w-[18px] flex-shrink-0" strokeWidth={2} aria-hidden="true" />
          <span className="relative z-10">{label}</span>
        </>
      )}
    </NavLink>
  );
}

function Section({ label }) {
  return <p className="px-2.5 pb-1 pt-4 text-[11px] font-medium uppercase tracking-wide text-fg-faint">{label}</p>;
}

// Sidebar aplikasi (Phase 8): brand + workspace switcher + nav grup persona + user menu.
export default function Sidebar({ onNavigate }) {
  const { isPlatformAdmin } = useAuth();
  const activeId = useId(); // layoutId indikator aktif, unik per instance
  return (
    <aside className="flex h-full w-64 flex-col border-r border-line bg-panel">
      <Link to="/orgs" onClick={onNavigate} className="flex items-center gap-2.5 px-4 py-3.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-fg">
          <BadgeCheck className="h-[18px] w-[18px]" strokeWidth={2.2} />
        </span>
        <span className="text-[15px] font-semibold tracking-tight text-fg">CertifyChain</span>
      </Link>

      <div className="px-3">
        <WorkspaceSwitcher onNavigate={onNavigate} />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-3">
        <Section label="Utama" />
        <NavItem to="/orgs" end label="Organisasi" icon={Building2} onNavigate={onNavigate} activeId={activeId} />

        <Section label="Pribadi" />
        <NavItem to="/me/certificates" label="Sertifikat saya" icon={ScrollText} onNavigate={onNavigate} activeId={activeId} />

        <Section label="Verifikasi" />
        <NavItem to="/scan" label="Scan QR" icon={QrCode} onNavigate={onNavigate} activeId={activeId} />
        <NavItem to="/search" label="Cari sertifikat" icon={Search} onNavigate={onNavigate} activeId={activeId} />

        {isPlatformAdmin && (
          <>
            <Section label="Admin" />
            <NavItem to="/admin/users" label="Pengguna" icon={Users} onNavigate={onNavigate} activeId={activeId} />
            <NavItem to="/admin/certificates" label="Semua sertifikat" icon={ListChecks} onNavigate={onNavigate} activeId={activeId} />
          </>
        )}
      </nav>

      <div className="border-t border-line p-2">
        <UserMenu />
      </div>
    </aside>
  );
}
