import { useState } from "react";
import { Link } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import Alert from "../components/Alert";
import Spinner from "../components/Spinner";
import { TextField } from "../components/Field";
import { searchPublicCertificates } from "../api/certificateApi";

// Phase 7f — Pencarian sertifikat PUBLIK (tanpa login). Cari by certId dan/atau nama
// institusi. Hasil tidak menampilkan identitas penerima (privasi); keaslian diverifikasi
// on-chain lewat halaman /verify/:id.
export default function PublicSearch() {
  const [certId, setCertId] = useState("");
  const [institution, setInstitution] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function run(toPage = 1) {
    if (!certId.trim() && !institution.trim()) {
      setError("Isi minimal Certificate ID atau nama institusi.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await searchPublicCertificates({
        certId: certId.trim() || undefined,
        institution: institution.trim() || undefined,
        page: toPage,
        limit: 10,
      });
      setData(res);
      setPage(toPage);
    } catch (e) {
      setError(e.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-fg">Cari Sertifikat</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Cari berdasarkan Certificate ID dan/atau nama institusi penerbit.
        </p>
      </div>

      <Card>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(1);
          }}
        >
          <TextField
            id="certId"
            label="Certificate ID"
            value={certId}
            onChange={(e) => setCertId(e.target.value)}
            placeholder="0x… (64 hex)"
            helper="Opsional bila mencari lewat nama institusi."
          />
          <TextField
            id="institution"
            label="Nama Institusi"
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            placeholder="mis. Universitas…"
            helper="Minimal 2 karakter. Pencocokan sebagian, tidak peka huruf besar/kecil."
          />
          <Button type="submit" loading={loading} className="w-full">Cari</Button>
        </form>
      </Card>

      {error && <Alert type="error">{error}</Alert>}

      {loading && !data && (
        <div className="flex items-center justify-center gap-3 py-8 text-fg-muted">
          <Spinner className="h-5 w-5" /><span className="text-sm">Mencari…</span>
        </div>
      )}

      {data && (
        <Card title={`Hasil (${data.pagination.total})`}>
          {data.items.length === 0 ? (
            <p className="text-sm text-fg-muted">Tidak ada sertifikat yang cocok.</p>
          ) : (
            <>
              <div className="space-y-3">
                {data.items.map((c) => (
                  <div key={c.certificateId} className="rounded-xl border border-line p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-fg">{c.institutionName || "Institusi —"}</p>
                        <code className="mt-0.5 block truncate font-mono text-xs text-fg-faint">{c.certificateId}</code>
                        <p className="mt-1 text-xs text-fg-faint">
                          {c.issuedAt ? new Date(c.issuedAt).toLocaleDateString("id-ID") : "—"} •{" "}
                          {c.status === "revoked" ? (
                            <span className="text-danger-fg">Dicabut</span>
                          ) : (
                            <span className="text-success-fg">Aktif</span>
                          )}
                        </p>
                      </div>
                      <Link to={`/verify/${c.certificateId}`}>
                        <Button variant="secondary">Verifikasi</Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
              {data.pagination.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between text-sm">
                  <Button variant="secondary" disabled={page <= 1} onClick={() => run(page - 1)}>← Sebelumnya</Button>
                  <span className="text-fg-muted">Hal {data.pagination.page} / {data.pagination.totalPages}</span>
                  <Button variant="secondary" disabled={page >= data.pagination.totalPages} onClick={() => run(page + 1)}>Berikutnya →</Button>
                </div>
              )}
            </>
          )}
        </Card>
      )}
    </div>
  );
}
