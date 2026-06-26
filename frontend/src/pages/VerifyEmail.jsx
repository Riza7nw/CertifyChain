import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import AuthShell from "../components/shell/AuthShell";
import Card from "../components/Card";
import Button from "../components/Button";
import Alert from "../components/Alert";

// Halaman verifikasi email (Phase 7b — sisi web). Token datang dari tautan email.
// Di dev (MAIL_PROVIDER=console) tautan dicetak di console backend:
//   {PUBLIC_BASE_URL}/verify-email?token=XXXX
// Saat dibuka, otomatis memanggil POST /api/v1/auth/verify-email (publik, tanpa login).
export default function VerifyEmail() {
  const { apiFetch } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState("loading"); // loading | success | error
  const [message, setMessage] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // token sekali-pakai → cegah panggilan ganda (StrictMode)
    ran.current = true;
    if (!token) {
      setStatus("error");
      setMessage("Token verifikasi tidak ada di tautan. Pastikan Anda membuka tautan lengkap dari email.");
      return;
    }
    (async () => {
      try {
        await apiFetch(`/v1/auth/verify-email`, { method: "POST", body: JSON.stringify({ token }) });
        setStatus("success");
        setMessage("Email Anda berhasil diverifikasi. Silakan masuk untuk melanjutkan.");
      } catch (err) {
        setStatus("error");
        setMessage(err.message || "Token verifikasi tidak valid atau sudah kedaluwarsa.");
      }
    })();
  }, [token, apiFetch]);

  return (
    <AuthShell>
      <Card title="Verifikasi email" description="Konfirmasi alamat email akun Anda.">
        {status === "loading" && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-brand" strokeWidth={2} />
            <p className="text-sm text-fg-muted">Memverifikasi email Anda…</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <Alert type="success" title="Email terverifikasi">{message}</Alert>
            <Button className="w-full" onClick={() => navigate("/login")}>Lanjut masuk</Button>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <Alert type="error" title="Verifikasi gagal">{message}</Alert>
            <p className="text-sm text-fg-muted">
              Tautan mungkin sudah dipakai atau kedaluwarsa. Masuk lalu minta “kirim ulang verifikasi” dari halaman Sertifikat Saya.
            </p>
            <Button variant="secondary" className="w-full" onClick={() => navigate("/login")}>Ke halaman masuk</Button>
          </div>
        )}
      </Card>
    </AuthShell>
  );
}
