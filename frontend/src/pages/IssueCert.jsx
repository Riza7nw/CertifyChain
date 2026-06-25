import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Plus, RotateCcw, ExternalLink, Download } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/Toast";
import Card from "../components/Card";
import Button from "../components/Button";
import Alert from "../components/Alert";
import PageHeader from "../components/PageHeader";
import CopyField from "../components/CopyField";
import { TextField, TextAreaField, FileField } from "../components/Field";

export default function IssueCert() {
  const { orgId } = useParams();
  const id = Number(orgId);
  const { apiFetch, memberships } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const orgName = memberships.find((m) => m.orgId === id)?.orgName || `Organisasi #${id}`;

  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
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
      if (recipientEmail.trim()) fd.append("recipientEmail", recipientEmail.trim());
      if (data.trim()) fd.append("data", data.trim());
      fd.append("file", file);
      const res = await apiFetch(`/v1/orgs/${id}/certificates`, { method: "POST", body: fd });
      setResult(res);
      setRecipientName("");
      setRecipientEmail("");
      setData("");
      setFile(null);
      toast.success("Sertifikat diterbitkan", "Tercatat di blockchain & IPFS.");
    } catch (err) {
      toast.error("Penerbitan gagal", err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        crumbs={[{ label: orgName, to: `/orgs/${id}` }, { label: "Terbitkan" }]}
        title="Terbitkan sertifikat"
        description="File di-pin ke IPFS; hash & CID dicatat di blockchain."
      />

      {result ? (
        <Card>
          <Alert type="success" title="Sertifikat berhasil diterbitkan">Bagikan QR atau link verifikasi di bawah.</Alert>
          <div className="mt-4 grid gap-5 sm:grid-cols-[170px_1fr] sm:items-start">
            {result.qrCode && (
              <div className="flex flex-col items-center gap-2">
                <img src={result.qrCode} alt="QR" className="h-40 w-40 rounded-xl border border-line bg-white p-2" />
                <a href={result.qrCode} download={`qr-${result.certificateId.slice(0, 10)}.png`} className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline">
                  <Download className="h-3.5 w-3.5" /> Unduh QR
                </a>
              </div>
            )}
            <div className="space-y-3">
              <CopyField label="Certificate ID" value={result.certificateId} />
              {result.verificationUrl && <CopyField label="Link verifikasi" value={result.verificationUrl} />}
              <CopyField label="Data hash" value={result.dataHash} />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button icon={ExternalLink} onClick={() => navigate(`/verify/${result.certificateId}`)}>Buka halaman verifikasi</Button>
            <Button variant="secondary" icon={RotateCcw} onClick={() => setResult(null)}>Terbitkan lagi</Button>
          </div>
        </Card>
      ) : (
        <Card title="Detail sertifikat">
          <form onSubmit={submit} className="space-y-4">
            {error && <Alert type="error">{error}</Alert>}
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField id="recipientName" label="Nama penerima" required placeholder="mis. Budi Santoso" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} disabled={loading} />
              <TextField id="recipientEmail" label="Email penerima" type="email" helper="Agar penerima bisa melihatnya di akunnya." placeholder="budi@email.com" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} disabled={loading} />
            </div>
            <FileField id="file" label="File sertifikat" required accept="application/pdf,image/*" fileName={file?.name} onChange={(e) => setFile(e.target.files?.[0] || null)} disabled={loading} helper="PDF atau gambar, maksimal 10 MB." />
            <TextAreaField id="data" label="Metadata tambahan (opsional)" placeholder="mis. Sarjana Teknik Informatika — 2026" value={data} onChange={(e) => setData(e.target.value)} disabled={loading} helper="Disertakan ke dalam hash integritas (keccak256)." />
            <div className="flex justify-end pt-1">
              <Button type="submit" loading={loading} icon={Plus}>{loading ? "Memproses transaksi…" : "Terbitkan sertifikat"}</Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
