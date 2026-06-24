import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import Alert from "../components/Alert";
import Spinner from "../components/Spinner";
import CopyField from "../components/CopyField";
import { TextField } from "../components/Field";
import { listInstitutions, registerInstitution } from "../api/certificateApi";

const EMPTY = { name: "", adminAddress: "", metadataCid: "" };

// Form pendaftaran institusi (platform admin). POST /institutions.
function RegisterForm({ onRegistered }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  function handleChange(e) {
    const { id, value } = e.target;
    setForm((prev) => ({ ...prev, [id]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setResult(null);
    if (!form.name.trim()) return setError("Nama institusi wajib diisi.");
    if (!form.adminAddress.trim()) return setError("Alamat admin (Ethereum) wajib diisi.");

    setLoading(true);
    try {
      const data = await registerInstitution({
        name: form.name.trim(),
        adminAddress: form.adminAddress.trim(),
        metadataCid: form.metadataCid.trim(),
      });
      setResult(data);
      setForm(EMPTY);
      onRegistered?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <div className="flex justify-end">
        <Button variant="secondary" onClick={() => setOpen(true)}>
          + Daftarkan institusi
        </Button>
      </div>
    );
  }

  return (
    <Card title="Daftarkan Institusi" description="Hanya untuk platform admin. Membuat akun issuer institusi on-chain.">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error">{error}</Alert>}
        {result && (
          <Alert type="success" title={`Institusi #${result.institutionId} terdaftar.`}>
            <div className="mt-2">
              <CopyField label="Transaction Hash" value={result.txHash} />
            </div>
          </Alert>
        )}
        <TextField
          id="name"
          label="Nama Institusi"
          placeholder="mis. Universitas Blockchain Indonesia"
          value={form.name}
          onChange={handleChange}
          disabled={loading}
        />
        <TextField
          id="adminAddress"
          label="Alamat Admin (Ethereum)"
          placeholder="0x…"
          value={form.adminAddress}
          onChange={handleChange}
          disabled={loading}
        />
        <TextField
          id="metadataCid"
          label="Metadata CID (opsional)"
          placeholder="CID IPFS metadata institusi"
          value={form.metadataCid}
          onChange={handleChange}
          disabled={loading}
        />
        <div className="flex justify-end gap-3 pt-1">
          <Button variant="ghost" type="button" onClick={() => setOpen(false)} disabled={loading}>
            Tutup
          </Button>
          <Button type="submit" loading={loading}>
            {loading ? "Mendaftarkan…" : "Daftarkan"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

export default function Institutions() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listInstitutions();
      setItems(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Institusi</h1>
        <p className="mt-1 text-sm text-slate-500">
          Daftar institusi penerbit sertifikat beserta jumlah sertifikat yang sudah diterbitkan.
        </p>
      </div>

      <RegisterForm onRegistered={load} />

      {error && <Alert type="error">{error}</Alert>}

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-12 text-slate-500">
          <Spinner className="h-6 w-6" />
          <span className="text-sm">Memuat daftar institusi…</span>
        </div>
      ) : items.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">
            Belum ada institusi terdaftar. Gunakan tombol “Daftarkan institusi” di atas.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((inst) => (
            <Link key={inst.id} to={`/institutions/${inst.id}`} className="group">
              <Card className="h-full transition group-hover:-translate-y-0.5 group-hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">{inst.name}</h2>
                    <p className="mt-0.5 text-xs text-slate-400">Institusi #{inst.id}</p>
                  </div>
                  <span
                    className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      inst.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {inst.active ? "Aktif" : "Nonaktif"}
                  </span>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-sm text-slate-600">
                    <strong className="text-slate-900">{inst.certificateCount}</strong> sertifikat
                  </span>
                  <span className="text-sm font-semibold text-brand-600">Lihat dashboard →</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
