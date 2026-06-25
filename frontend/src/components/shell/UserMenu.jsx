import { useNavigate } from "react-router-dom";
import { LogOut, Monitor, Moon, Sun, Shield } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { useTheme } from "../../theme/ThemeContext";
import Menu, { MenuItem, MenuLabel, MenuDivider } from "../Menu";
import Avatar from "../Avatar";
import Badge from "../Badge";

// Menu user (Phase 8): identitas + pilihan tema + logout.
export default function UserMenu() {
  const navigate = useNavigate();
  const { user, isPlatformAdmin, logout } = useAuth();
  const { theme, setTheme } = useTheme();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  const trigger = (
    <div className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-surface-hover">
      <Avatar name={user?.name || user?.email} size="sm" />
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-[13px] font-medium text-fg">{user?.name || user?.email}</p>
        <p className="truncate text-[11px] text-fg-faint">{user?.email}</p>
      </div>
    </div>
  );

  const themeBtn = (val, Icon, label) => (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); setTheme(val); }}
      aria-label={label}
      className={`flex h-7 flex-1 items-center justify-center rounded-md transition-colors ${
        theme === val ? "bg-brand-subtle text-brand-subtle-fg" : "text-fg-muted hover:bg-surface-hover"
      }`}
    >
      <Icon className="h-4 w-4" strokeWidth={2} />
    </button>
  );

  return (
    <Menu trigger={trigger} width="w-[240px]" align="left">
      <div className="px-2 py-1.5">
        <div className="flex items-center gap-2">
          {isPlatformAdmin && <Badge tone="brand" icon={Shield}>Platform Admin</Badge>}
        </div>
      </div>
      <MenuLabel>Tema</MenuLabel>
      <div className="flex gap-1 px-1.5 pb-1" onClick={(e) => e.stopPropagation()}>
        {themeBtn("light", Sun, "Terang")}
        {themeBtn("dark", Moon, "Gelap")}
        {themeBtn("system", Monitor, "Sistem")}
      </div>
      <MenuDivider />
      <MenuItem icon={LogOut} danger onClick={handleLogout}>Keluar</MenuItem>
    </Menu>
  );
}
