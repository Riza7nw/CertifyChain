import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import Card from "../components/Card";
import Button from "../components/Button";
import Alert from "../components/Alert";
import { TextField } from "../components/Field";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
            </svg>
          </div>
          <span className="text-lg font-bold text-slate-900">CertifyChain</span>
        </div>
        <Card title="Masuk" description="Login ke dashboard institusi Anda.">
          <form onSubmit={submit} className="space-y-4">
            {error && <Alert type="error">{error}</Alert>}
            <TextField id="email" label="Email" type="email" autoComplete="username" placeholder="nama@institusi.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} required />
            <TextField id="password" label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} required />
            <Button type="submit" loading={loading} className="w-full">Masuk</Button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-500">
            Belum punya akun?{" "}
            <Link to="/register" className="font-semibold text-brand-600 hover:underline">Daftar institusi</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
