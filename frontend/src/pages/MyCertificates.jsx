import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Download, ShieldCheck, MailWarning, ScrollText, CheckCircle2, XCircle } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/Toast";
import Card from "../components/Card";
import Button from "../components/Button";
import Alert from "../components/Alert";
import Badge from "../components/Badge";
import PageHeader from "../components/PageHeader";
import Pagination from "../components/Pagination";
import CertStatus from "../components/CertStatus";
import EmptyState from "../components/EmptyState";
import { SkeletonRows } from "../components/Skeleton";

export default function MyCertificates() {
  const { apiFetch, apiBlob, emailVerified, user } = useAuth();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState({});
  const [statusMap, setStatusMap] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await apiFetch(`/v1/me/certificates?page=${page}&limit=12`));
    } catch (e) {
      toast.error("Gagal memuat", e.message);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, page, toast]);

  useEffect(() => {
    if (emailVerified) load();
    else setLoading(false);
  }, [emailVerified, load]);

  async function resendVerification() {
    try {
      await apiFetch("/v1/auth/resend-verification", { method: "POST", body: "{}" });
      toast.success("Email verifikasi dikirim", "Cek kotak masuk Anda.");
    } catch (e) {
      toast.error("Gagal mengirim", e.message);
    }
  }

  async function download(certId) {
    setBusy((b) => ({ ...b, [certId]: "download" }));
    try {
      const blob = await apiBlob(`/v1/me/certificates/${certId}/download`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificate-${certId.slice(0, 10)}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error("Unduhan gagal", e.message);
    } finally {
      setBusy((b) => ({ ...b, [certId]: undefined }));
    }
  }

  async function checkStatus(certId) {
    setBusy((b) => ({ ...b, [certId]: "status" }));
    try {
      const s = await apiFetch(`/v1/me/certificates/${certId}/status`);
      setStatusMap((m) => ({ ...m, [certId]: s }));
    } catch (e) {
      toast.error("Gagal cek status", e.message);
    } finally {
      setBusy((b) => ({ ...b, [certId]: undefined }));
    }
  }

  if (!emailVerified) {
    return (
      <div className="space-y-5">
        <PageHeader title="Sertifikat saya" />
        <Card>
          <Alert type="warning" title="Email belum diverifikasi">
            Verifikasi email <span className="font-medium">{user?.email}</span> untuk melihat dan mengunduh sertifikat Anda.
          </Alert>
          <div className="mt-4">
            <Button icon={MailWarning} onClick={resendVerification}>Kirim ulang email verifikasi</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Sertifikat saya" description={`Diterbitkan untuk ${user?.email}`} />

      {loading && !data ? (
        <Card><SkeletonRows rows={3} /></Card>
      ) : data?.items?.length ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.items.map((c) => {
              const st = statusMap[c.certificateId];
              return (
                <div key={c.certificateId} className="flex flex-col rounded-xl border border-line bg-surface p-4 shadow-xs">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-subtle text-brand-subtle-fg">
                        <ScrollText className="h-[18px] w-[18px]" strokeWidth={2} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-fg">{c.recipientName || "Sertifikat"}</p>
                        <p className="text-xs text-fg-faint">{c.issuedAt ? new Date(c.issuedAt).toLocaleDateString("id-ID") : "—"}</p>
                      </div>
                    </div>
                    <CertStatus status={c.status} />
                  </div>
                  <code className="mb-3 block truncate rounded-md bg-app px-2 py-1 font-mono text-[11px] text-fg-faint">{c.certificateId}</code>
                  {st && (
                    <div className="mb-3">
                      {st.onChainValid ? (
                        <Badge tone="success" icon={CheckCircle2}>Asli & tercatat on-chain</Badge>
                      ) : (
                        <Badge tone="danger" icon={XCircle}>Tidak valid on-chain</Badge>
                      )}
                    </div>
                  )}
                  <div className="mt-auto flex gap-2">
                    <Button size="sm" variant="secondary" icon={ShieldCheck} loading={busy[c.certificateId] === "status"} onClick={() => checkStatus(c.certificateId)}>Cek status</Button>
                    <Button size="sm" icon={Download} loading={busy[c.certificateId] === "download"} disabled={!c.fileCid} onClick={() => download(c.certificateId)}>Unduh</Button>
                  </div>
                </div>
              );
            })}
          </div>
          {data?.pagination && (
            <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} total={data.pagination.total} onChange={setPage} />
          )}
        </>
      ) : (
        <Card>
          <EmptyState
            icon={ScrollText}
            title="Belum ada sertifikat"
            description="Sertifikat yang ditujukan ke email Anda akan muncul di sini."
            action={<Link to="/search"><Button variant="secondary">Cari sertifikat publik</Button></Link>}
          />
        </Card>
      )}
    </div>
  );
}
