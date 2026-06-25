import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, FileText, ListChecks } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import Card from "../components/Card";
import Alert from "../components/Alert";
import PageHeader from "../components/PageHeader";
import DataTable from "../components/DataTable";
import Pagination from "../components/Pagination";
import CertStatus from "../components/CertStatus";
import EmptyState from "../components/EmptyState";
import { SkeletonRows } from "../components/Skeleton";

export default function AdminCertificates() {
  const { apiFetch, isPlatformAdmin } = useAuth();
  const [data, setData] = useState(null);
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
    return <Alert type="error" title="Akses ditolak">Halaman ini khusus platform admin.</Alert>;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Semua sertifikat"
        description={data ? `${data.pagination.total} sertifikat lintas institusi` : "Seluruh sertifikat lintas institusi."}
      />

      {error && <Alert type="error">{error}</Alert>}

      <Card bodyClassName="px-4 py-3">
        {loading && !data ? (
          <SkeletonRows rows={6} />
        ) : (
          <>
            <DataTable
              rows={data?.items || []}
              rowKey={(r) => r.certificateId}
              empty={<EmptyState icon={ListChecks} title="Belum ada sertifikat" description="Sertifikat yang diterbitkan akan muncul di sini." />}
              columns={[
                {
                  header: "Penerima",
                  primary: true,
                  cell: (r) => (
                    <div>
                      <p className="font-medium text-fg">{r.recipientName || "—"}</p>
                      {r.recipientEmail && <p className="text-xs text-fg-faint">{r.recipientEmail}</p>}
                    </div>
                  ),
                },
                { header: "Institusi", cell: (r) => <span className="text-fg-muted">#{r.institutionId}</span> },
                { header: "Diterbitkan", cell: (r) => <span className="text-fg-muted">{r.issuedAt ? new Date(r.issuedAt).toLocaleDateString("id-ID") : "—"}</span> },
                { header: "Status", cell: (r) => <CertStatus status={r.status} /> },
                { header: "File", cell: (r) => (r.fileUrl ? <a href={r.fileUrl} target="_blank" rel="noreferrer" className="inline-flex text-brand hover:text-brand-hover" aria-label="Buka file"><FileText className="h-4 w-4" /></a> : <span className="text-fg-faint">—</span>) },
                { header: "", align: "right", hideLabel: true, cell: (r) => <Link to={`/verify/${r.certificateId}`} className="inline-flex items-center gap-1 text-sm text-brand hover:underline">Verifikasi <ExternalLink className="h-3.5 w-3.5" /></Link> },
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
