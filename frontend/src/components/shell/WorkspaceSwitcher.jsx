import { useNavigate } from "react-router-dom";
import { ChevronsUpDown, UserRound, Building2, LayoutGrid } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import Menu, { MenuItem, MenuLabel, MenuDivider } from "../Menu";
import Avatar from "../Avatar";

// Pemilih konteks kerja (Phase 8): organisasi anggota atau "Akun Pribadi".
export default function WorkspaceSwitcher({ onNavigate }) {
  const navigate = useNavigate();
  const { memberships, currentOrg, setCurrentOrgId, isPlatformAdmin } = useAuth();

  const label = currentOrg?.orgName || "Akun Pribadi";
  const sub = currentOrg ? currentOrg.role : "Penerima";

  function go(fn) {
    fn();
    onNavigate?.();
  }

  const trigger = (
    <div className="flex items-center gap-2.5 rounded-lg border border-line bg-surface px-2.5 py-2 transition-colors hover:bg-surface-hover">
      <Avatar name={label} square brand size="sm" />
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-[13px] font-medium text-fg">{label}</p>
        <p className="truncate text-[11px] text-fg-faint">{sub}</p>
      </div>
      <ChevronsUpDown className="h-4 w-4 flex-shrink-0 text-fg-faint" aria-hidden="true" />
    </div>
  );

  return (
    <Menu trigger={trigger} width="w-[232px]">
      {memberships.length > 0 && <MenuLabel>Organisasi</MenuLabel>}
      {memberships.map((m) => (
        <MenuItem
          key={m.orgId}
          icon={Building2}
          active={currentOrg?.orgId === m.orgId}
          onClick={() => go(() => { setCurrentOrgId(m.orgId); navigate(`/orgs/${m.orgId}`); })}
        >
          {m.orgName}
        </MenuItem>
      ))}
      {memberships.length > 0 && <MenuDivider />}
      <MenuItem icon={UserRound} onClick={() => go(() => navigate("/me/certificates"))}>
        Akun Pribadi
      </MenuItem>
      {isPlatformAdmin && (
        <MenuItem icon={LayoutGrid} onClick={() => go(() => navigate("/"))}>
          Semua organisasi
        </MenuItem>
      )}
    </Menu>
  );
}
