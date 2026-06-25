import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../auth/AuthContext";
import Card from "../components/Card";
import Button from "../components/Button";
import Alert from "../components/Alert";
import Spinner from "../components/Spinner";
import { TextField, SelectField } from "../components/Field";

// Phase 7f — "Kelola User" (khusus platform admin): daftar user + ubah role/status + hapus.
export default function AdminUsers() {
  const { apiFetch, isPlatformAdmin, user } = useAuth();
  const [data, setData] = useState(null); // { pagination, items }
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

  async function patch(id, body) {
    setBusyId(id);
    setError(null);
    try {
      await apiFetch(`/v1/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(body) });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(u) {
    if (!window.confirm(`Hapus user ${u.email}? Tindakan ini permanen.`)) return;
    setBusyId(u.id);
    setError(null);
    try {
      await apiFetch(`/v1/admin/users/${u.id}`, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  if (!isPlatformAdmin) {
    return (
      <div className="animate-fade-in">
        <Alert type="error" title="Akses ditolak">Halaman ini khusus platform admin.</Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-fg">Kelola User</h1>
        <p className="mt-1 text-sm text-fg-muted">Atur peran, status aktif, dan hapus akun pengguna.</p>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {/* Filter */}
      <Card>
        <form
          className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            load();
          }}
        >
          <TextField id="q" label="Cari email" value={q} onChange={(e) => setQ(e.target.value)} placeholder="nama@contoh.com" />
          <SelectField id="role" label="Role" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
            <option value="">Semua</option>
            <option value="admin">admin</option>
            <option value="user">user</option>
          </SelectField>
          <SelectField id="active" label="Status" value={active} onChange={(e) => { setActive(e.target.value); setPage(1); }}>
            <option value="">Semua</option>
            <option value="true">Aktif</option>
            <option value="false">Nonaktif</option>
          </SelectField>
          <div className="flex items-end">
            <Button type="submit" className="w-full">Cari</Button>
          </div>
        </form>
      </Card>

      <Card>
        {loading && !data ? (
          <div className="flex items-center gap-3 py-6 text-fg-muted">
            <Spinner className="h-5 w-5" /><span className="text-sm">Memuat…</span>
          </div>
        ) : data?.items?.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-fg-faint">
                    <th className="py-2 pr-3">User</th>
                    <th className="py-2 pr-3">Role</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((u) => {
                    const self = u.id === user?.id;
                    const busy = busyId === u.id;
                    return (
                      <tr key={u.id} className="border-b border-line align-top">
                        <td className="py-3 pr-3">
                          <p className="font-medium text-fg">
                            {u.email} {self && <span className="text-xs text-fg-faint">(Anda)</span>}
                          </p>
                          <p className="text-xs text-fg-faint">
                            {u.name || "—"} •{" "}
                            {u.emailVerified ? (
                              <span className="text-success-fg">email terverifikasi</span>
                            ) : (
                              <span className="text-warning-fg">belum verifikasi</span>
                            )}
                          </p>
                          {u.memberships?.length > 0 && (
                            <p className="mt-0.5 text-xs text-fg-faint">
                              {u.memberships.map((m) => `${m.orgName} (${m.role})`).join(", ")}
                            </p>
                          )}
                        </td>
                        <td className="py-3 pr-3">
                          <select
                            value={u.role}
                            disabled={self || busy}
                            onChange={(e) => patch(u.id, { role: e.target.value })}
                            className="rounded-lg border border-line-strong bg-surface px-2 py-1 text-sm text-fg disabled:bg-surface-hover disabled:text-fg-faint"
                          >
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                          </select>
                        </td>
                        <td className="py-3 pr-3">
                          {u.active ? (
                            <span className="text-success-fg">Aktif</span>
                          ) : (
                            <span className="text-fg-faint">Nonaktif</span>
                          )}
                        </td>
                        <td className="py-3">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="secondary"
                              disabled={self || busy}
                              loading={busy}
                              onClick={() => patch(u.id, { active: !u.active })}
                            >
                              {u.active ? "Nonaktifkan" : "Aktifkan"}
                            </Button>
                            <Button
                              variant="ghost"
                              className="text-danger-fg hover:bg-danger-subtle"
                              disabled={self || busy}
                              onClick={() => remove(u)}
                            >
                              Hapus
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {data.pagination.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between text-sm">
                <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Sebelumnya</Button>
                <span className="text-fg-muted">Hal {data.pagination.page} / {data.pagination.totalPages}</span>
                <Button variant="secondary" disabled={page >= data.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Berikutnya →</Button>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-fg-muted">Tidak ada user yang cocok.</p>
        )}
      </Card>
    </div>
  );
}
