import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import AuthShell from "../components/shell/AuthShell";
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
    <AuthShell>
      <Card title="Masuk" description="Login ke dashboard institusi Anda.">
        <form onSubmit={submit} className="space-y-4">
          {error && <Alert type="error">{error}</Alert>}
          <TextField id="email" label="Email" type="email" autoComplete="username" placeholder="nama@institusi.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} required />
          <TextField id="password" label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loading} required />
          <Button type="submit" loading={loading} className="w-full">Masuk</Button>
        </form>
        <p className="mt-4 text-center text-sm text-fg-muted">
          Belum punya akun?{" "}
          <Link to="/register" className="font-medium text-brand hover:underline">Daftar institusi</Link>
        </p>
      </Card>
    </AuthShell>
  );
}
