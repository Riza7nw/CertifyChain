import { useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import Alert from "../components/Alert";
import Spinner from "../components/Spinner";
import { TextField } from "../components/Field";
import { extractCertificateId } from "../utils/qr";

// Lazy-load: library kamera (html5-qrcode) besar, hanya dimuat saat halaman ini dibuka.
const QrScanner = lazy(() => import("../components/QrScanner"));

// Halaman publik untuk memindai QR (kamera/gambar) atau mengetik certificateId,
// lalu mengarahkan ke halaman verifikasi publik.
export default function ScanVerify() {
  const navigate = useNavigate();
  const [manualId, setManualId] = useState("");
  const [error, setError] = useState(null);

  // Dipanggil baik dari hasil scan QR maupun input manual.
  function handleValue(rawValue) {
    const id = extractCertificateId(rawValue);
    if (!id) {
      setError("QR / teks tidak berisi certificateId yang valid (bytes32 hex).");
      return;
    }
    setError(null);
    navigate(`/verify/${id}`);
  }

  function handleManualSubmit(e) {
    e.preventDefault();
    handleValue(manualId);
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">Verifikasi Sertifikat</h1>
        <p className="mt-1 text-sm text-slate-500">
          Pindai QR Code pada sertifikat, atau masukkan Certificate ID secara manual.
        </p>
      </div>

      {error && <Alert type="error">{error}</Alert>}

      <Card title="Pindai QR Code">
        <Suspense
          fallback={
            <div className="flex items-center justify-center gap-3 py-8 text-slate-500">
              <Spinner className="h-5 w-5" />
              <span className="text-sm">Memuat pemindai…</span>
            </div>
          }
        >
          <QrScanner onResult={handleValue} />
        </Suspense>
      </Card>

      <Card title="Atau masukkan Certificate ID">
        <form onSubmit={handleManualSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <TextField
            id="manualId"
            label="Certificate ID"
            placeholder="0x… (bytes32) atau tempel link verifikasi"
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" className="sm:mb-0.5" disabled={!manualId.trim()}>
            Verify
          </Button>
        </form>
      </Card>
    </div>
  );
}
