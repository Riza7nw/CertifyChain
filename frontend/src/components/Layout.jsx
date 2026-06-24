import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const icons = {
  orgs: "M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16m14 0H5m14 0h2m-2 0v-4a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1v4m-6 0v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4m-6 0H5m4-12h2m-2 4h2m4-4h2m-2 4h2",
  scan: "M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4v-4m-4 0h.01M4 8h2V4M4 16v4h4M4 12h.01M8 4h.01M16 4h4v4",
  logout: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h4a3 3 0 0 1 3 3v1",
};

const navItems = [
  { to: "/", label: "Organisasi", icon: "orgs", end: true },
  { to: "/scan", label: "Scan QR", icon: "scan" },
];

function NavItem({ to, label, icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
          isActive ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        }`
      }
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d={icons[icon]} />
      </svg>
      {label}
    </NavLink>
  );
}

export default function Layout({ children }) {
  const navigate = useNavigate();
  const { user, memberships, currentOrgId, setCurrentOrgId, isPlatformAdmin, logout } = useAuth();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  function switchOrg(e) {
    const id = Number(e.target.value);
    setCurrentOrgId(id);
    if (id) navigate(`/orgs/${id}`);
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex items-center gap-2.5 px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">CertifyChain</p>
            <p className="text-xs text-slate-400">{isPlatformAdmin ? "Platform Admin" : "Dashboard"}</p>
          </div>
        </div>

        {/* Org switcher */}
        {memberships.length > 0 && (
          <div className="px-3 pb-1">
            <label className="px-3 text-xs font-medium uppercase tracking-wide text-slate-400">Organisasi aktif</label>
            <select
              value={currentOrgId ?? ""}
              onChange={switchOrg}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            >
              {memberships.map((m) => (
                <option key={m.orgId} value={m.orgId}>{m.orgName} ({m.role})</option>
              ))}
            </select>
          </div>
        )}

        <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
          {navItems.map((item) => <NavItem key={item.to} {...item} />)}
        </nav>

        <div className="border-t border-slate-100 px-3 py-3">
          {user && <p className="truncate px-3 pb-2 text-xs text-slate-500">{user.email}</p>}
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-700"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d={icons.logout} />
            </svg>
            Logout
          </button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3 md:hidden">
          <span className="font-bold text-slate-900">CertifyChain</span>
          <button onClick={handleLogout} className="text-sm font-medium text-red-600">Logout</button>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-white px-3 py-2 md:hidden">
          {navItems.map((item) => <NavItem key={item.to} {...item} />)}
        </nav>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <div className="mx-auto max-w-4xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
