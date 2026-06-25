import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ScanLine } from "lucide-react";
import Card from "../components/Card";
import Button from "../components/Button";
import Alert from "../components/Alert";
import Spinner from "../components/Spinner";
import VerificationResult from "../components/VerificationResult";
import { verifyCertificate, getCertificate } from "../api/certificateApi";
import { isBytes32 } from "../utils/qr";

export default function PublicVerify() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const run = useCallback(async () => {
    if (!isBytes32(id)) {
      setError("Format Certificate ID pada tautan tidak valid.");
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
    <div className="space-y-5">
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
            <Link to="/scan"><Button variant="secondary" icon={ScanLine}>Scan / verifikasi lain</Button></Link>
          </div>
        </Card>
      )}

      {!loading && result && (
        <>
          <VerificationResult valid={result.valid} detail={result.detail} />
          <div className="flex justify-center">
            <Link to="/scan"><Button variant="secondary" icon={ScanLine}>Verifikasi sertifikat lain</Button></Link>
          </div>
        </>
      )}
    </div>
  );
}
