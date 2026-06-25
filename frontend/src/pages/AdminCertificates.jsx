import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import Card from "../components/Card";
import Button from "../components/Button";
import Alert from "../components/Alert";
import Spinner from "../components/Spinner";

// Phase 7f — "Semua Sertifikat" (khusus platform admin): seluruh sertifikat lintas institusi.
export default function AdminCertificates() {
  const { apiFetch, isPlatformAdmin } = useAuth();
  const [data, setData] = useState(null); // { pagination, items }
  const [page, setPage] = useState(1);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await apiFetch(`/v1/admin/certificates?page=${page}&limit=15`));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, page]);

  useEffect(() => {
    if (isPlatformAdmin) load();
  }, [isPlatformAdmin, load]);

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
        <h1 className="text-2xl font-bold text-fg">Semua Sertifikat</h1>
        <p className="mt-1 text-sm text-fg-muted">
          {data ? `${data.pagination.total} sertifikat` : "Seluruh sertifikat lintas institusi."}
        </p>
      </div>

      {error && <Alert type="error">{error}</Alert>}

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
                    <th className="py-2 pr-3">Penerima</th>
                    <th className="py-2 pr-3">Institusi</th>
                    <th className="py-2 pr-3">Diterbitkan</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">File</th>
                    <th className="py-2">Verifikasi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((c) => (
                    <tr key={c.certificateId} className="border-b border-line">
                      <td className="py-2.5 pr-3">
                        <p className="font-medium text-fg">{c.recipientName || "—"}</p>
                        {c.recipientEmail && <p className="text-xs text-fg-faint">{c.recipientEmail}</p>}
                      </td>
                      <td className="py-2.5 pr-3 text-fg-muted">#{c.institutionId}</td>
                      <td className="py-2.5 pr-3 text-fg-muted">
                        {c.issuedAt ? new Date(c.issuedAt).toLocaleDateString("id-ID") : "—"}
                      </td>
                      <td className="py-2.5 pr-3">
                        {c.status === "revoked" ? (
                          <span className="text-danger-fg">Dicabut</span>
                        ) : (
                          <span className="text-success-fg">Aktif</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3">
                        {c.fileUrl ? (
                          <a href={c.fileUrl} target="_blank" rel="noreferrer" className="text-brand hover:underline">📄</a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="py-2.5">
                        <Link to={`/verify/${c.certificateId}`} className="text-brand hover:underline">verify</Link>
                      </td>
                    </tr>
                  ))}
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
          <p className="text-sm text-fg-muted">Belum ada sertifikat.</p>
        )}
      </Card>
    </div>
  );
}
