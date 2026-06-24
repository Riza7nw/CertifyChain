import { useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import Alert from "../components/Alert";
import { TextField } from "../components/Field";
import { loginAdmin } from "../api/certificateApi";
import { setToken, isAuthenticated } from "../auth/auth";

const EMPTY = { username: "", password: "" };

// Halaman login admin. Standalone (tanpa sidebar dashboard) karena dipakai
// sebelum terautentikasi. Setelah sukses, simpan token & kembali ke halaman asal.
export default function LoginAdmin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Tujuan setelah login: halaman yang tadinya diminta (dari guard), atau dashboard.
  const from = location.state?.from?.pathname || "/";

  // Bila sudah login, tak perlu tampilkan form lagi.
  if (isAuthenticated()) {
    return <Navigate to={from} replace />;
  }

  function handleChange(e) {
    const { id, value } = e.target;
    setForm((prev) => ({ ...prev, [id]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!form.username.trim() || !form.password) {
      setError("Username dan password wajib diisi.");
      return;
    }

    setLoading(true);
    try {
      const data = await loginAdmin({
        username: form.username.trim(),
        password: form.password,
      });
      setToken(data.token);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Brand */}
        <div className="mb-6 flex flex-col items-center gap-2.5 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
            </svg>
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900">CertifyChain</p>
            <p className="text-sm text-slate-500">Masuk sebagai admin untuk menerbitkan sertifikat</p>
          </div>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <Alert type="error">{error}</Alert>}

            <TextField
              id="username"
              label="Username"
              placeholder="admin"
              autoComplete="username"
              value={form.username}
              onChange={handleChange}
              disabled={loading}
            />
            <TextField
              id="password"
              label="Password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              value={form.password}
              onChange={handleChange}
              disabled={loading}
            />

            <Button type="submit" loading={loading} className="w-full">
              {loading ? "Memverifikasi..." : "Masuk"}
            </Button>
          </form>
        </Card>

        <p className="mt-5 text-center text-xs text-slate-400">
          Halaman verifikasi publik tidak memerlukan login.
        </p>
      </div>
    </div>
  );
}
