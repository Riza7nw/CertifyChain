import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import Card from "../components/Card";
import Button from "../components/Button";
import Alert from "../components/Alert";
import Spinner from "../components/Spinner";
import PageHeader from "../components/PageHeader";
import VerificationResult from "../components/VerificationResult";
import { TextField } from "../components/Field";
import { verifyCertificate, getCertificate } from "../api/certificateApi";

export default function VerifyCertificate() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [id, setId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const runVerify = useCallback(async (certificateId) => {
    const trimmed = certificateId.trim();
    if (!trimmed) {
      setError("Masukkan Certificate ID terlebih dahulu.");
      return;
    }
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const verifyRes = await verifyCertificate(trimmed);
      let detail = null;
      try {
        detail = await getCertificate(trimmed);
      } catch {
        /* tidak ditemukan -> detail null */
      }
      setResult({ valid: verifyRes.valid, detail });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

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
    <div className="space-y-5">
      <PageHeader title="Verifikasi sertifikat" description="Masukkan Certificate ID untuk mengecek keaslian & detail." />

      <Card>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <TextField id="certificateId" label="Certificate ID" placeholder="0x… (bytes32)" value={id} onChange={(e) => setId(e.target.value)} disabled={loading} className="flex-1" />
          <Button type="submit" loading={loading} icon={ShieldCheck}>{loading ? "Memverifikasi…" : "Verifikasi"}</Button>
        </form>
      </Card>

      {error && <Alert type="error">{error}</Alert>}

      {loading && (
        <div className="flex items-center justify-center gap-3 py-10 text-fg-muted">
          <Spinner className="h-6 w-6" />
          <span className="text-sm">Mengambil data dari blockchain…</span>
        </div>
      )}

      {!loading && result && <VerificationResult valid={result.valid} detail={result.detail} />}
    </div>
  );
}
