import { useEffect, useState, useCallback } from "react";
import { Trash2, Search, ShieldOff } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/Toast";
import { useConfirm } from "../components/Confirm";
import Card from "../components/Card";
import Button from "../components/Button";
import Alert from "../components/Alert";
import Badge from "../components/Badge";
import PageHeader from "../components/PageHeader";
import DataTable from "../components/DataTable";
import Pagination from "../components/Pagination";
import EmptyState from "../components/EmptyState";
import { SkeletonRows } from "../components/Skeleton";
import { TextField, SelectField } from "../components/Field";

export default function AdminUsers() {
  const { apiFetch, isPlatformAdmin, user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [active, setActive] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({ page: String(page), limit: "10" });
    if (q.trim()) qs.set("q", q.trim());
    if (role) qs.set("role", role);
    if (active) qs.set("active", active);
    try {
      setData(await apiFetch(`/v1/admin/users?${qs.toString()}`));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, page, q, role, active]);

  useEffect(() => {
    if (isPlatformAdmin) load();
  }, [isPlatformAdmin, load]);

  async function patch(id, body, okMsg) {
    setBusyId(id);
    try {
      await apiFetch(`/v1/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      if (okMsg) toast.success(okMsg);
      await load();
    } catch (e) {
      toast.error("Gagal memperbarui", e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(u) {
    const ok = await confirm({
      title: "Hapus pengguna?",
      description: `Akun ${u.email} akan dihapus permanen beserta keanggotaannya.`,
      confirmText: "Hapus",
    });
    if (!ok) return;
    setBusyId(u.id);
    try {
      await apiFetch(`/v1/admin/users/${u.id}`, { method: "DELETE" });
      toast.success("Pengguna dihapus");
      await load();
    } catch (e) {
      toast.error("Gagal menghapus", e.message);
    } finally {
      setBusyId(null);
    }
  }

  if (!isPlatformAdmin) {
    return <Alert type="error" title="Akses ditolak">Halaman ini khusus platform admin.</Alert>;
  }

  const selectCls = "rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-sm text-fg disabled:bg-surface-hover disabled:text-fg-faint";

  return (
    <div className="space-y-5">
      <PageHeader title="Kelola pengguna" description="Atur peran, status aktif, dan hapus akun." />

      {error && <Alert type="error">{error}</Alert>}

      <Card bodyClassName="px-4 py-3.5">
        <form
          className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]"
          onSubmit={(e) => { e.preventDefault(); setPage(1); load(); }}
        >
          <TextField id="q" label="Cari email" value={q} onChange={(e) => setQ(e.target.value)} placeholder="nama@contoh.com" />
          <SelectField id="role" label="Role" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
            <option value="">Semua role</option>
            <option value="admin">admin</option>
            <option value="user">user</option>
          </SelectField>
          <SelectField id="active" label="Status" value={active} onChange={(e) => { setActive(e.target.value); setPage(1); }}>
            <option value="">Semua status</option>
            <option value="true">Aktif</option>
            <option value="false">Nonaktif</option>
          </SelectField>
          <div className="flex items-end">
            <Button type="submit" icon={Search} className="w-full">Cari</Button>
          </div>
        </form>
      </Card>

      <Card bodyClassName="px-4 py-3">
        {loading && !data ? (
          <SkeletonRows rows={5} />
        ) : (
          <>
            <DataTable
              rows={data?.items || []}
              rowKey={(u) => u.id}
              empty={<EmptyState icon={Search} title="Tidak ada pengguna" description="Tidak ada akun yang cocok dengan filter." />}
              columns={[
                {
                  header: "Pengguna",
                  primary: true,
                  cell: (u) => (
                    <div>
                      <p className="font-medium text-fg">
                        {u.email} {u.id === user?.id && <span className="text-xs font-normal text-fg-faint">(Anda)</span>}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-fg-faint">
                        <span>{u.name || "—"}</span>
                        {u.emailVerified ? <Badge tone="success">terverifikasi</Badge> : <Badge tone="warning">belum verifikasi</Badge>}
                      </div>
                      {u.memberships?.length > 0 && (
                        <p className="mt-1 text-xs text-fg-faint">{u.memberships.map((m) => `${m.orgName} (${m.role})`).join(", ")}</p>
                      )}
                    </div>
                  ),
                },
                {
                  header: "Role",
                  cell: (u) => (
                    <select
                      value={u.role}
                      disabled={u.id === user?.id || busyId === u.id}
                      onChange={(e) => patch(u.id, { role: e.target.value }, "Role diperbarui")}
                      className={selectCls}
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  ),
                },
                { header: "Status", cell: (u) => (u.active ? <Badge tone="success" dot>Aktif</Badge> : <Badge tone="neutral" dot>Nonaktif</Badge>) },
                {
                  header: "",
                  align: "right",
                  hideLabel: true,
                  cell: (u) => (
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button size="sm" variant="secondary" icon={ShieldOff} disabled={u.id === user?.id || busyId === u.id} onClick={() => patch(u.id, { active: !u.active }, u.active ? "Pengguna dinonaktifkan" : "Pengguna diaktifkan")}>
                        {u.active ? "Nonaktifkan" : "Aktifkan"}
                      </Button>
                      <Button size="sm" variant="destructive" icon={Trash2} disabled={u.id === user?.id || busyId === u.id} onClick={() => remove(u)}>
                        Hapus
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
            {data?.pagination && (
              <Pagination className="mt-4" page={data.pagination.page} totalPages={data.pagination.totalPages} total={data.pagination.total} onChange={setPage} />
            )}
          </>
        )}
      </Card>
    </div>
  );
}
