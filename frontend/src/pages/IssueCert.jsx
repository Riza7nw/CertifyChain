import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Plus, RotateCcw, ExternalLink, Download, Sparkles, Upload, FileSignature } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/Toast";
import Card from "../components/Card";
import Button from "../components/Button";
import Alert from "../components/Alert";
import Badge from "../components/Badge";
import PageHeader from "../components/PageHeader";
import CopyField from "../components/CopyField";
import { TextField, TextAreaField, FileField, SelectField } from "../components/Field";

export default function IssueCert() {
  const { orgId } = useParams();
  const id = Number(orgId);
  const { apiFetch, memberships } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const orgName = memberships.find((m) => m.orgId === id)?.orgName || `Organisasi #${id}`;

  const [mode, setMode] = useState("generate"); // 'generate' | 'upload'
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [data, setData] = useState("");
  const [file, setFile] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [templateKey, setTemplateKey] = useState("classic");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    apiFetch(`/v1/orgs/${id}/templates`)
      .then((t) => { if (t?.length) { setTemplates(t); setTemplateKey(t[0].id); } })
      .catch(() => {});
  }, [apiFetch, id]);

  const selectedAccent = templates.find((t) => t.id === templateKey)?.accent;

  async function submit(e) {
    e.preventDefault();
    setError(null);
    if (!recipientName.trim()) return setError("Nama penerima wajib diisi.");
    if (mode === "upload" && !file) return setError("File sertifikat wajib diunggah.");
    setLoading(true);
    try {
      let res;
      if (mode === "generate") {
        res = await apiFetch(`/v1/orgs/${id}/certificates/generate`, {
          method: "POST",
          body: JSON.stringify({ recipientName: recipientName.trim(), recipientEmail: recipientEmail.trim() || undefined, data: data.trim() || undefined, template: templateKey }),
        });
      } else {
        const fd = new FormData();
        fd.append("recipientName", recipientName.trim());
        if (recipientEmail.trim()) fd.append("recipientEmail", recipientEmail.trim());
        if (data.trim()) fd.append("data", data.trim());
        fd.append("file", file);
        res = await apiFetch(`/v1/orgs/${id}/certificates`, { method: "POST", body: fd });
      }
      setResult(res);
      setRecipientName(""); setRecipientEmail(""); setData(""); setFile(null);
      toast.success("Sertifikat diterbitkan", "Tercatat di blockchain.");
    } catch (err) {
      toast.error("Penerbitan gagal", err.message);
    } finally {
      setLoading(false);
    }
  }

  const tab = (key, label, Icon) => (
    <button
      type="button"
      onClick={() => setMode(key)}
      className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        mode === key ? "bg-surface text-fg shadow-xs" : "text-fg-muted hover:text-fg"
      }`}
    >
      <Icon className="h-4 w-4" strokeWidth={2} /> {label}
    </button>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        crumbs={[{ label: orgName, to: `/orgs/${id}` }, { label: "Terbitkan" }]}
        title="Terbitkan sertifikat"
        description="Generate PDF dari template, atau unggah file sendiri. Hash & CID dicatat di blockchain."
      />

      {result ? (
        <Card>
          <Alert type="success" title="Sertifikat berhasil diterbitkan">Bagikan QR atau link verifikasi di bawah.</Alert>
          {result.signed && <div className="mt-3"><Badge tone="brand" icon={FileSignature}>Ditandatangani digital (PAdES)</Badge></div>}
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
              {result.fileUrl && (
                <a href={result.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-brand hover:underline">
                  <Download className="h-4 w-4" /> Unduh PDF sertifikat
                </a>
              )}
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button icon={ExternalLink} onClick={() => navigate(`/verify/${result.certificateId}`)}>Buka halaman verifikasi</Button>
            <Button variant="secondary" icon={RotateCcw} onClick={() => setResult(null)}>Terbitkan lagi</Button>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="mb-4 flex gap-1 rounded-xl bg-app p-1">
            {tab("generate", "Generate PDF", Sparkles)}
            {tab("upload", "Unggah file", Upload)}
          </div>
          <form onSubmit={submit} className="space-y-4">
            {error && <Alert type="error">{error}</Alert>}
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField id="recipientName" label="Nama penerima" required placeholder="mis. Budi Santoso" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} disabled={loading} />
              <TextField id="recipientEmail" label="Email penerima" type="email" helper="Agar penerima bisa melihatnya di akunnya." placeholder="budi@email.com" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} disabled={loading} />
            </div>

            {mode === "generate" ? (
              <div>
                <SelectField id="templateKey" label="Template" value={templateKey} onChange={(e) => setTemplateKey(e.target.value)} disabled={loading || !templates.length} helper="Desain & branding PDF sertifikat.">
                  {templates.length ? templates.map((t) => <option key={t.id} value={t.id}>{t.name}{t.scope === "org" ? " (institusi)" : ""}</option>) : <option value="classic">Classic</option>}
                </SelectField>
                {selectedAccent && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-fg-faint">
                    <span className="h-4 w-4 rounded-full border border-line" style={{ backgroundColor: selectedAccent }} />
                    Warna aksen {selectedAccent}
                    <Link to={`/orgs/${id}/templates`} className="ml-auto text-brand hover:underline">Kelola template</Link>
                  </div>
                )}
              </div>
            ) : (
              <FileField id="file" label="File sertifikat" required accept="application/pdf,image/*" fileName={file?.name} onChange={(e) => setFile(e.target.files?.[0] || null)} disabled={loading} helper="PDF atau gambar, maksimal 10 MB." />
            )}

            <TextAreaField id="data" label={mode === "generate" ? "Isi / deskripsi sertifikat (opsional)" : "Metadata tambahan (opsional)"} placeholder="mis. Sarjana Teknik Informatika — 2026" value={data} onChange={(e) => setData(e.target.value)} disabled={loading} helper="Tercetak di PDF (mode generate) & masuk hash integritas." />

            <div className="flex justify-end pt-1">
              <Button type="submit" loading={loading} icon={mode === "generate" ? Sparkles : Plus}>
                {loading ? "Memproses transaksi…" : mode === "generate" ? "Generate & terbitkan" : "Terbitkan sertifikat"}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
