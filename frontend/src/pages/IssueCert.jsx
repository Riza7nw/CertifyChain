import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import Card from "../components/Card";
import Button from "../components/Button";
import Alert from "../components/Alert";
import CopyField from "../components/CopyField";
import { TextField, TextAreaField, FileField } from "../components/Field";

export default function IssueCert() {
  const { orgId } = useParams();
  const id = Number(orgId);
  const { apiFetch } = useAuth();
  const navigate = useNavigate();

  const [recipientName, setRecipientName] = useState("");
  const [data, setData] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    if (!recipientName.trim()) return setError("Nama penerima wajib diisi.");
    if (!file) return setError("File sertifikat wajib diunggah.");
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("recipientName", recipientName.trim());
      if (data.trim()) fd.append("data", data.trim());
      fd.append("file", file);
      const res = await apiFetch(`/v1/orgs/${id}/certificates`, { method: "POST", body: fd });
      setResult(res);
      setRecipientName("");
      setData("");
      setFile(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <Link to={`/orgs/${id}`} className="text-xs text-brand-600 hover:underline">← Dashboard organisasi</Link>
        <h1 className="text-2xl font-bold text-slate-900">Terbitkan Sertifikat</h1>
        <p className="mt-1 text-sm text-slate-500">File akan di-pin ke IPFS, hash & CID dicatat di blockchain.</p>
      </div>

      {result && (
        <Card className="border-emerald-200">
          <Alert type="success" title="Sertifikat berhasil diterbitkan!">Bagikan QR / link verifikasi di bawah.</Alert>
          <div className="mt-4 grid gap-5 sm:grid-cols-[170px,1fr] sm:items-start">
            {result.qrCode && (
              <div className="flex flex-col items-center gap-2">
                <img src={result.qrCode} alt="QR" className="h-40 w-40 rounded-xl border border-slate-200 bg-white p-2" />
                <a href={result.qrCode} download={`qr-${result.certificateId.slice(0, 10)}.png`} className="text-xs font-semibold text-brand-600 hover:underline">⬇ Unduh QR</a>
              </div>
            )}
            <div className="space-y-3">
              <CopyField label="Certificate ID" value={result.certificateId} />
              {result.verificationUrl && <CopyField label="Link Verifikasi" value={result.verificationUrl} />}
              <CopyField label="Data Hash" value={result.dataHash} />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={() => navigate(`/verify/${result.certificateId}`)}>Buka halaman verifikasi</Button>
            <Button variant="secondary" onClick={() => setResult(null)}>Terbitkan lagi</Button>
          </div>
        </Card>
      )}

      {!result && (
        <Card title="Detail Sertifikat">
          <form onSubmit={submit} className="space-y-4">
            {error && <Alert type="error">{error}</Alert>}
            <TextField id="recipientName" label="Nama Penerima" placeholder="mis. Budi Santoso" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} disabled={loading} />
            <FileField id="file" label="File Sertifikat" accept="application/pdf,image/*" fileName={file?.name} onChange={(e) => setFile(e.target.files?.[0] || null)} disabled={loading} helper="PDF atau gambar, maksimal 10 MB." />
            <TextAreaField id="data" label="Data / Metadata Tambahan (opsional)" placeholder="mis. Sarjana Teknik Informatika — 2026" value={data} onChange={(e) => setData(e.target.value)} disabled={loading} helper="Disertakan ke dalam hash integritas (keccak256)." />
            <div className="flex justify-end pt-1">
              <Button type="submit" loading={loading}>{loading ? "Memproses transaksi…" : "Issue Certificate"}</Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
