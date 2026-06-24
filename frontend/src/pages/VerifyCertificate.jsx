import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import Alert from "../components/Alert";
import Spinner from "../components/Spinner";
import { TextField } from "../components/Field";
import { verifyCertificate, getCertificate } from "../api/certificateApi";

// Badge status valid / tidak valid
function ResultBadge({ valid }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${
        valid ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${valid ? "bg-emerald-500" : "bg-red-500"}`} />
      {valid ? "VALID" : "TIDAK VALID"}
    </span>
  );
}

// Baris detail
function DetailRow({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-slate-100 py-3 last:border-0 sm:flex-row sm:justify-between sm:gap-4">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="break-all text-sm font-medium text-slate-900 sm:text-right">{children}</span>
    </div>
  );
}

export default function VerifyCertificate() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [id, setId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // { valid, detail }

  const runVerify = useCallback(async (certificateId) => {
    const trimmed = certificateId.trim();
    if (!trimmed) {
      setError("Masukkan certificateId terlebih dahulu.");
      return;
    }

    setError(null);
    setResult(null);
    setLoading(true);
    try {
      // 1) Verifikasi status valid/tidak
      const verifyRes = await verifyCertificate(trimmed);

      // 2) Coba ambil detail (mungkin gagal kalau tidak ditemukan)
      let detail = null;
      try {
        detail = await getCertificate(trimmed);
      } catch {
        /* sertifikat tidak ada -> detail tetap null */
      }

      setResult({ valid: verifyRes.valid, detail });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-verify jika datang dengan ?id= dari halaman Issue
  useEffect(() => {
    const queryId = searchParams.get("id");
    if (queryId) {
      setId(queryId);
      runVerify(queryId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    setSearchParams(id.trim() ? { id: id.trim() } : {});
    runVerify(id);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Verify Certificate</h1>
        <p className="mt-1 text-sm text-slate-500">
          Masukkan certificateId untuk mengecek keaslian dan melihat detail sertifikat.
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <TextField
            id="certificateId"
            label="Certificate ID"
            placeholder="0x... (bytes32)"
            value={id}
            onChange={(e) => setId(e.target.value)}
            disabled={loading}
            className="flex-1"
          />
          <Button type="submit" loading={loading} className="sm:mb-0.5">
            {loading ? "Memverifikasi..." : "Verify"}
          </Button>
        </form>
      </Card>

      {/* Error */}
      {error && <Alert type="error">{error}</Alert>}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center gap-3 py-10 text-slate-500">
          <Spinner className="h-6 w-6" />
          <span className="text-sm">Mengambil data dari blockchain...</span>
        </div>
      )}

      {/* Hasil */}
      {!loading && result && (
        <Card className="animate-fade-in">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Hasil Verifikasi</h2>
            <ResultBadge valid={result.valid} />
          </div>

          {result.valid ? (
            <Alert type="success" className="mb-4">
              Sertifikat ini <strong>asli</strong> dan terverifikasi di blockchain.
            </Alert>
          ) : (
            <Alert type="warning" className="mb-4">
              Sertifikat tidak valid — kemungkinan tidak pernah diterbitkan atau sudah dicabut.
            </Alert>
          )}

          {result.detail ? (
            <div className="rounded-xl bg-slate-50 px-4 py-2">
              <DetailRow label="Nama Penerima">{result.detail.recipientName || "—"}</DetailRow>
              <DetailRow label="Institusi Penerbit">{result.detail.institutionName || "—"}</DetailRow>
              <DetailRow label="Status">
                {result.detail.isValid ? "Aktif" : "Dicabut"}
              </DetailRow>
              <DetailRow label="Diterbitkan">
                {new Date(result.detail.issuedAt).toLocaleString("id-ID")}
              </DetailRow>
              {result.detail.fileUrl && (
                <DetailRow label="File Sertifikat">
                  <a
                    href={result.detail.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-brand-600 hover:underline"
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
          ) : (
            <p className="text-sm text-slate-500">Detail sertifikat tidak tersedia.</p>
          )}
        </Card>
      )}
    </div>
  );
}
