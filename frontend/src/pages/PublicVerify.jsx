import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import Alert from "../components/Alert";
import Spinner from "../components/Spinner";
import { verifyCertificate, getCertificate } from "../api/certificateApi";
import { isBytes32 } from "../utils/qr";

// Hasil besar VALID / TIDAK VALID
function VerdictBanner({ valid }) {
  return (
    <div
      className={`flex flex-col items-center gap-2 rounded-2xl border px-6 py-8 text-center ${
        valid ? "border-line bg-success-subtle" : "border-line bg-danger-subtle"
      }`}
    >
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-full ${
          valid ? "bg-success" : "bg-danger"
        } text-white`}
      >
        <svg className="h-9 w-9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
          {valid ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          )}
        </svg>
      </div>
      <p className={`text-xl font-bold ${valid ? "text-success-fg" : "text-danger-fg"}`}>
        {valid ? "Sertifikat Terverifikasi" : "Sertifikat Tidak Valid"}
      </p>
      <p className={`text-sm ${valid ? "text-success-fg" : "text-danger-fg"}`}>
        {valid
          ? "Sertifikat ini asli dan tercatat di blockchain."
          : "Sertifikat tidak ditemukan atau telah dicabut."}
      </p>
    </div>
  );
}

function DetailRow({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-line py-3 last:border-0 sm:flex-row sm:justify-between sm:gap-4">
      <span className="text-sm text-fg-muted">{label}</span>
      <span className="break-all text-sm font-medium text-fg sm:text-right">{children}</span>
    </div>
  );
}

export default function PublicVerify() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // { valid, detail }

  const run = useCallback(async () => {
    if (!isBytes32(id)) {
      setError("Format certificateId pada link tidak valid.");
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const verifyRes = await verifyCertificate(id);
      let detail = null;
      try {
        detail = await getCertificate(id);
      } catch {
        /* tidak ditemukan -> detail null */
      }
      setResult({ valid: verifyRes.valid, detail });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    run();
  }, [run]);

  return (
    <div className="space-y-5 animate-fade-in">
      {loading && (
        <div className="flex items-center justify-center gap-3 py-16 text-fg-muted">
          <Spinner className="h-6 w-6" />
          <span className="text-sm">Memverifikasi ke blockchain…</span>
        </div>
      )}

      {!loading && error && (
        <Card>
          <Alert type="error">{error}</Alert>
          <div className="mt-4">
            <Link to="/scan">
              <Button variant="secondary">Scan / verifikasi lain</Button>
            </Link>
          </div>
        </Card>
      )}

      {!loading && result && (
        <>
          <VerdictBanner valid={result.valid} />

          {result.detail && (
            <Card title="Detail Sertifikat">
              <div className="rounded-xl bg-surface-hover px-4 py-2">
                <DetailRow label="Nama Penerima">{result.detail.recipientName || "—"}</DetailRow>
                <DetailRow label="Penerbit">{result.detail.institutionName || "—"}</DetailRow>
                <DetailRow label="Status">{result.detail.isValid ? "Aktif" : "Dicabut"}</DetailRow>
                <DetailRow label="Diterbitkan">
                  {new Date(result.detail.issuedAt).toLocaleString("id-ID")}
                </DetailRow>
                {result.detail.fileUrl && (
                  <DetailRow label="File Sertifikat">
                    <a
                      href={result.detail.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-brand hover:underline"
                    >
                      📄 Buka file (IPFS)
                    </a>
                  </DetailRow>
                )}
                <DetailRow label="Data Hash">
                  <code className="font-mono text-xs">{result.detail.dataHash}</code>
                </DetailRow>
                <DetailRow label="Certificate ID">
                  <code className="font-mono text-xs">{result.detail.certificateId}</code>
                </DetailRow>
              </div>
            </Card>
          )}

          <div className="flex justify-center">
            <Link to="/scan">
              <Button variant="secondary">Verifikasi sertifikat lain</Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
