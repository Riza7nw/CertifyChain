import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import Card from "../components/Card";
import Button from "../components/Button";
import Alert from "../components/Alert";
import Spinner from "../components/Spinner";

export default function OrgDashboard() {
  const { orgId } = useParams();
  const id = Number(orgId);
  const { apiFetch, isPlatformAdmin, memberships, setCurrentOrgId } = useAuth();

  const membership = memberships.find((m) => m.orgId === id);
  const role = isPlatformAdmin ? "PlatformAdmin" : membership?.role;
  const canIssue = isPlatformAdmin || ["OrgAdmin", "Issuer"].includes(membership?.role);
  const orgName = membership?.orgName || `Organisasi #${id}`;

  const [data, setData] = useState(null); // { pagination, items, provisioned }
  const [stats, setStats] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [provisioning, setProvisioning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, s] = await Promise.all([
        apiFetch(`/v1/orgs/${id}/certificates?page=${page}&limit=10`),
        apiFetch(`/v1/orgs/${id}/stats`),
      ]);
      setData(c);
      setStats(s);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, id, page]);

  useEffect(() => {
    setCurrentOrgId(id);
    load();
  }, [load, id, setCurrentOrgId]);

  async function provision() {
    setProvisioning(true);
    setError(null);
    try {
      await apiFetch(`/v1/orgs/${id}/provision`, { method: "POST", body: "{}" });
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setProvisioning(false);
    }
  }

  const provisioned = data?.provisioned;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/" className="text-xs text-brand-600 hover:underline">← Semua organisasi</Link>
          <h1 className="text-2xl font-bold text-slate-900">{orgName}</h1>
          <p className="mt-0.5 text-sm text-slate-500">Peran Anda: {role || "—"}</p>
        </div>
        {canIssue && provisioned && (
          <Link to={`/orgs/${id}/issue`}><Button>+ Terbitkan Sertifikat</Button></Link>
        )}
        {isPlatformAdmin && data && !provisioned && (
          <Button onClick={provision} loading={provisioning}>Provision on-chain</Button>
        )}
      </div>

      {error && <Alert type="error">{error}</Alert>}
      {data && !provisioned && (
        <Alert type="warning">
          Organisasi ini belum diprovision on-chain, jadi belum bisa menerbitkan sertifikat.
          {isPlatformAdmin ? " Klik “Provision on-chain” untuk mendaftarkannya." : " Hubungi platform admin untuk provisioning."}
        </Alert>
      )}

      {/* Statistik ringkas */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><p className="text-xs uppercase tracking-wide text-slate-400">Total Sertifikat</p><p className="mt-1 text-2xl font-bold text-slate-900">{stats?.totals?.certificates ?? "—"}</p></Card>
        <Card><p className="text-xs uppercase tracking-wide text-slate-400">Verifikasi (deret harian)</p><p className="mt-1 text-2xl font-bold text-slate-900">{(stats?.verifiedDaily || []).reduce((s, d) => s + Number(d.count || 0), 0)}</p></Card>
        <Card><p className="text-xs uppercase tracking-wide text-slate-400">Status on-chain</p><p className="mt-1 text-2xl font-bold">{provisioned ? <span className="text-emerald-600">Aktif</span> : <span className="text-amber-600">Belum</span>}</p></Card>
      </div>

      <Card title="Sertifikat Diterbitkan">
        {loading && !data ? (
          <div className="flex items-center gap-3 py-6 text-slate-500"><Spinner className="h-5 w-5" /><span className="text-sm">Memuat…</span></div>
        ) : data?.items?.length ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-2 pr-3">Penerima</th><th className="py-2 pr-3">Diterbitkan</th><th className="py-2 pr-3">Status</th><th className="py-2 pr-3">File</th><th className="py-2">Verifikasi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((c) => (
                    <tr key={c.certificateId} className="border-b border-slate-50">
                      <td className="py-2.5 pr-3 font-medium text-slate-800">{c.recipientName || "—"}</td>
                      <td className="py-2.5 pr-3 text-slate-500">{c.issuedAt ? new Date(c.issuedAt).toLocaleDateString("id-ID") : "—"}</td>
                      <td className="py-2.5 pr-3">{c.status === "revoked" ? <span className="text-red-600">Dicabut</span> : <span className="text-emerald-600">Aktif</span>}</td>
                      <td className="py-2.5 pr-3">{c.fileUrl ? <a href={c.fileUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">📄</a> : "—"}</td>
                      <td className="py-2.5"><Link to={`/verify/${c.certificateId}`} className="text-brand-600 hover:underline">verify</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {data.pagination.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between text-sm">
                <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Sebelumnya</Button>
                <span className="text-slate-500">Hal {data.pagination.page} / {data.pagination.totalPages}</span>
                <Button variant="secondary" disabled={page >= data.pagination.totalPages} onClick={() => setPage((p) => p + 1)}>Berikutnya →</Button>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-slate-500">Belum ada sertifikat.</p>
        )}
      </Card>
    </div>
  );
}
