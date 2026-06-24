import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import Alert from "../components/Alert";
import Spinner from "../components/Spinner";
import { getInstitution, listInstitutionCertificates } from "../api/certificateApi";

const PAGE_SIZE = 20;

function shortId(id) {
  if (!id) return "—";
  return `${id.slice(0, 10)}…${id.slice(-6)}`;
}

function StatusBadge({ status }) {
  const valid = String(status).toLowerCase() === "valid";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
        valid ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
      }`}
    >
      {status || "—"}
    </span>
  );
}

export default function InstitutionDetail() {
  const { id } = useParams();
  const [institution, setInstitution] = useState(null);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null); // { pagination, items }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Detail institusi (sekali saja)
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const inst = await getInstitution(id);
        if (active) setInstitution(inst);
      } catch {
        /* detail opsional — judul fallback ke #id */
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  // Daftar sertifikat (paginasi, butuh JWT admin)
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listInstitutionCertificates(id, { page, limit: PAGE_SIZE });
      setData(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id, page]);

  useEffect(() => {
    load();
  }, [load]);

  const pagination = data?.pagination;
  const items = data?.items || [];
  const totalPages = pagination?.totalPages || 1;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to="/institutions" className="text-sm font-medium text-brand-600 hover:underline">
            ← Semua institusi
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            {institution?.name || `Institusi #${id}`}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {pagination ? `${pagination.total} sertifikat diterbitkan` : "Dashboard sertifikat institusi"}
          </p>
        </div>
        {institution && (
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              institution.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
            }`}
          >
            {institution.active ? "Aktif" : "Nonaktif"}
          </span>
        )}
      </div>

      {error && <Alert type="error">{error}</Alert>}

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-12 text-slate-500">
          <Spinner className="h-6 w-6" />
          <span className="text-sm">Memuat sertifikat…</span>
        </div>
      ) : items.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">Institusi ini belum menerbitkan sertifikat.</p>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-3 font-medium">Penerima</th>
                  <th className="px-5 py-3 font-medium">Certificate ID</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Diterbitkan</th>
                  <th className="px-5 py-3 font-medium">File</th>
                  <th className="px-5 py-3 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((c) => (
                  <tr key={c.certificateId} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-900">{c.recipientName || "—"}</td>
                    <td className="px-5 py-3">
                      <code className="font-mono text-xs text-slate-500">{shortId(c.certificateId)}</code>
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {c.issuedAt ? new Date(c.issuedAt).toLocaleDateString("id-ID") : "—"}
                    </td>
                    <td className="px-5 py-3">
                      {c.fileUrl ? (
                        <a
                          href={c.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="font-semibold text-brand-600 hover:underline"
                        >
                          📄 Buka
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        to={`/verify/${c.certificateId}`}
                        className="font-semibold text-brand-600 hover:underline"
                      >
                        Verifikasi
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginasi */}
          {pagination && totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
              <p className="text-xs text-slate-500">
                Halaman {pagination.page} dari {totalPages} • {pagination.total} total
              </p>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  ← Sebelumnya
                </Button>
                <Button
                  variant="secondary"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Berikutnya →
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
