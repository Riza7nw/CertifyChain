import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import Button from "./Button";
import Alert from "./Alert";

// Komponen pemindai QR berbasis "html5-qrcode".
// Dua mode: (1) kamera live, (2) unggah gambar QR.
// Memanggil onResult(decodedText) saat QR terbaca.
const REGION_ID = "qr-reader-region";

export default function QrScanner({ onResult }) {
  const scannerRef = useRef(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState(null);

  // Pastikan kamera dimatikan saat komponen dilepas (hindari kamera tetap menyala).
  useEffect(() => {
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startCamera() {
    setError(null);
    try {
      const scanner = new Html5Qrcode(REGION_ID, { verbose: false });
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" }, // kamera belakang di HP
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decodedText) => {
          onResult(decodedText);
          stopCamera();
        },
        () => {} // abaikan error decode per-frame (wajar saat belum fokus)
      );
      setActive(true);
    } catch {
      setError(
        "Tidak bisa mengakses kamera. Berikan izin kamera, dan pastikan halaman dibuka via HTTPS atau localhost."
      );
      scannerRef.current = null;
    }
  }

  async function stopCamera() {
    const scanner = scannerRef.current;
    if (scanner) {
      try {
        if (scanner.isScanning) await scanner.stop();
        await scanner.clear();
      } catch {
        /* abaikan */
      }
      scannerRef.current = null;
    }
    setActive(false);
  }

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset agar file sama bisa dipilih lagi
    if (!file) return;

    setError(null);
    await stopCamera(); // jangan tabrakan dengan kamera
    const scanner = new Html5Qrcode(REGION_ID, { verbose: false });
    try {
      const decodedText = await scanner.scanFile(file, true);
      onResult(decodedText);
    } catch {
      setError("QR tidak terbaca dari gambar. Coba gambar yang lebih jelas/terang.");
    } finally {
      try {
        await scanner.clear();
      } catch {
        /* abaikan */
      }
    }
  }

  return (
    <div className="space-y-4">
      {error && <Alert type="error">{error}</Alert>}

      {/* Area render kamera / preview gambar */}
      <div
        id={REGION_ID}
        className="mx-auto w-full max-w-xs overflow-hidden rounded-xl border border-line-strong bg-surface-hover"
        style={{ minHeight: active ? undefined : 0 }}
      />

      <div className="flex flex-wrap items-center justify-center gap-3">
        {!active ? (
          <Button onClick={startCamera} variant="primary">
            Nyalakan Kamera
          </Button>
        ) : (
          <Button onClick={stopCamera} variant="secondary">
            Matikan Kamera
          </Button>
        )}

        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-fg transition hover:bg-surface-hover">
          Unggah Gambar QR
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </label>
      </div>
    </div>
  );
}
