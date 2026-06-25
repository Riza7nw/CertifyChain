import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import Card from "../components/Card";
import Button from "../components/Button";
import Alert from "../components/Alert";
import Spinner from "../components/Spinner";

// Phase 7f — "Sertifikat Saya": daftar sertifikat milik penerima (by recipient_email),
// dengan unduh file (akses-terkontrol) + cek status keaslian on-chain.
// Backend butuh email TERVERIFIKASI; bila belum, tampilkan ajakan verifikasi.
export default function MyCertificates() {
  const { apiFetch, apiBlob, emailVerified, user } = useAuth();
  const [data, setData] = useState(null); // { pagination, items }
  const [page, setPage] = useState(1);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState({}); // { [certId]: "download" | "status" }
  const [statusMap, setStatusMap] = useState({}); // { [certId]: { onChainValid } }
  const [resendMsg, setResendMsg] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await apiFetch(`/v1/me/certificates?page=${page}&limit=10`));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [apiFetch, page]);

  useEffect(() => {
    if (emailVerified) load();
    else setLoading(false);
  }, [emailVerified, load]);

  async function resendVerification() {
    setResendMsg(null);
    try {
      await apiFetch("/v1/auth/resend-verification", { method: "POST", body: "{}" });
      setResendMsg("Email verifikasi telah dikirim ulang. Cek kotak masuk Anda.");
    } catch (e) {
      setResendMsg(e.message);
    }
  }

  async function download(certId) {
    setBusy((b) => ({ ...b, [certId]: "download" }));
    setError(null);
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
      setError(e.message);
    } finally {
      setBusy((b) => ({ ...b, [certId]: undefined }));
    }
  }

  async function checkStatus(certId) {
    setBusy((b) => ({ ...b, [certId]: "status" }));
    setError(null);
    try {
      const s = await apiFetch(`/v1/me/certificates/${certId}/status`);
      setStatusMap((m) => ({ ...m, [certId]: s }));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy((b) => ({ ...b, [certId]: undefined }));
    }
  }

  // --- Email belum terverifikasi ---
  if (!emailVerified) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-fg">Sertifikat Saya</h1>
        <Card>
          <Alert type="warning" title="Email belum diverifikasi">
            Verifikasi email <span className="font-semibold">{user?.email}</span> untuk melihat dan mengunduh
            sertifikat yang ditujukan kepada Anda.
          </Alert>
          <div className="mt-4">
            <Button onClick={resendVerification}>Kirim ulang email verifikasi</Button>
          </div>
          {resendMsg && <p className="mt-3 text-sm text-fg-muted">{resendMsg}</p>}
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-fg">Sertifikat Saya</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Sertifikat yang diterbitkan untuk <span className="font-medium">{user?.email}</span>.
        </p>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <Card>
        {loading && !data ? (
          <div className="flex items-center gap-3 py-6 text-fg-muted">
            <Spinner className="h-5 w-5" />
            <span className="text-sm">Memuat…</span>
          </div>
        ) : data?.items?.length ? (
          <>
            <div className="space-y-3">
              {data.items.map((c) => {
                const st = statusMap[c.certificateId];
                return (
                  <div
                    key={c.certificateId}
                    className="flex flex-col gap-3 rounded-xl border border-line p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-fg">{c.recipientName || "Sertifikat"}</p>
                      <p className="mt-0.5 text-xs text-fg-faint">
                        {c.issuedAt ? new Date(c.issuedAt).toLocaleDateString("id-ID") : "—"} •{" "}
                        {c.status === "revoked" ? (
                          <span className="text-danger-fg">Dicabut</span>
                        ) : (
                          <span className="text-success-fg">Aktif</span>
                        )}
                      </p>
                      <code className="mt-1 block truncate font-mono text-xs text-fg-faint">{c.certificateId}</code>
                      {st && (
                        <p className="mt-1 text-xs font-medium">
                          {st.onChainValid ? (
                            <span className="text-success-fg">● Asli & tercatat on-chain</span>
                          ) : (
                            <span className="text-danger-fg">● Tidak valid / dicabut on-chain</span>
                          )}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-shrink-0 flex-wrap gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => checkStatus(c.certificateId)}
                        loading={busy[c.certificateId] === "status"}
                      >
                        Cek status
                      </Button>
                      <Button
                        onClick={() => download(c.certificateId)}
                        loading={busy[c.certificateId] === "download"}
                        disabled={!c.fileCid}
                      >
                        Unduh
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            {data.pagination.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between text-sm">
                <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  ← Sebelumnya
                </Button>
                <span className="text-fg-muted">
                  Hal {data.pagination.page} / {data.pagination.totalPages}
                </span>
                <Button
                  variant="secondary"
                  disabled={page >= data.pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Berikutnya →
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="py-6 text-center">
            <p className="text-sm text-fg-muted">Belum ada sertifikat yang ditujukan ke email Anda.</p>
            <Link to="/search" className="mt-2 inline-block text-sm text-brand hover:underline">
              Cari sertifikat publik →
            </Link>
          </div>
        )}
      </Card>
    </div>
  );
}
