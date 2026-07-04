import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import AuthShell from "../components/shell/AuthShell";
import Card from "../components/Card";
import Button from "../components/Button";
import Alert from "../components/Alert";
import { TextField } from "../components/Field";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ orgName: "", name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError(null);
    if (form.password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }
    setLoading(true);
    try {
      await register({ email: form.email.trim(), password: form.password, name: form.name.trim() || undefined, orgName: form.orgName.trim() });
      navigate("/orgs", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <Card title="Daftar Institusi" description="Buat akun & organisasi penerbit Anda.">
        <form onSubmit={submit} className="space-y-4">
          {error && <Alert type="error">{error}</Alert>}
          <TextField id="orgName" label="Nama Institusi" placeholder="Universitas Contoh" value={form.orgName} onChange={set("orgName")} disabled={loading} required />
          <TextField id="name" label="Nama Anda" placeholder="Admin Institusi" value={form.name} onChange={set("name")} disabled={loading} />
          <TextField id="email" label="Email" type="email" autoComplete="username" placeholder="admin@institusi.com" value={form.email} onChange={set("email")} disabled={loading} required />
          <TextField id="password" label="Password" type="password" autoComplete="new-password" helper="Minimal 8 karakter." value={form.password} onChange={set("password")} disabled={loading} required />
          <Button type="submit" loading={loading} className="w-full">Daftar</Button>
        </form>
        <p className="mt-4 text-center text-sm text-fg-muted">
          Sudah punya akun?{" "}
          <Link to="/login" className="font-medium text-brand hover:underline">Masuk</Link>
        </p>
      </Card>
    </AuthShell>
  );
}
