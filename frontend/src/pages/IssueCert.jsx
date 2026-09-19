import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Plus, RotateCcw, ExternalLink, Download, Sparkles, Upload, FileSignature, Loader2 } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../components/Toast";
import Card from "../components/Card";
import Button from "../components/Button";
import Alert from "../components/Alert";
import Badge from "../components/Badge";
import PageHeader from "../components/PageHeader";
import CopyField from "../components/CopyField";
import { TextField, TextAreaField, FileField, SelectField } from "../components/Field";
import { EASE, springPop } from "../lib/motion";
import { resolveFileUrl, validatePdfSelection, validatePdfHeader } from "../utils/certificateFiles";

export default function IssueCert() {
  const { orgId } = useParams();
  const id = Number(orgId);
  const { apiFetch, apiBlob, memberships } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const orgName = memberships.find((m) => m.orgId === id)?.orgName || `Organisasi #${id}`;
  const reduce = useReducedMotion();

  const [mode, setMode] = useState("upload"); // 'generate' | 'upload'
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [data, setData] = useState("");
  const [file, setFile] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [templateKey, setTemplateKey] = useState("classic");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [dlBusy, setDlBusy] = useState(false);
  // Fase C-scale: bila backend memakai antrian async, generate balas 202 + jobId.
  // Frontend lalu polling status job sampai 'done' (tampilkan hasil) / 'failed'.
  const [jobId, setJobId] = useState(null);
  const [jobInfo, setJobInfo] = useState(null);

  useEffect(() => {
    apiFetch(`/v1/orgs/${id}/templates`)
      .then((t) => { if (t?.length) { setTemplates(t); setTemplateKey(t[0].id); } })
      .catch(() => {});
  }, [apiFetch, id]);

  // Polling status job render (mode async). Berhenti saat done/failed atau unmount.
  useEffect(() => {
    if (!jobId) return;
    let active = true;
    let timer;
    async function poll() {
      try {
        const info = await apiFetch(`/v1/render-jobs/${jobId}`);
        if (!active) return;
        setJobInfo(info);
        if (info.status === "done") {
          setResult(info.result);
          setJobId(null);
          toast.success("Sertifikat selesai diproses", "Tercatat di blockchain.");
          return;
        }
        if (info.status === "failed") {
          toast.error("Render gagal", info.lastError || "Job tidak dapat diselesaikan.");
          return; // berhenti; UI menampilkan kartu gagal
        }
        timer = setTimeout(poll, 2000);
      } catch (err) {
        if (active) toast.error("Gagal memeriksa status", err.message);
      }
    }
    poll();
    return () => { active = false; clearTimeout(timer); };
  }, [jobId, apiFetch, toast]);

  const selectedAccent = templates.find((t) => t.id === templateKey)?.accent;
  const resultFileUrl = resolveFileUrl(result?.fileUrl);

  function selectPdf(e) {
    const selected = e.target.files?.[0] || null;
    const message = selected ? validatePdfSelection(selected) : null;
    setFile(message ? null : selected);
    setError(message);
    if (message) e.target.value = "";
  }

  async function submit(e) {
    e.preventDefault();
    setError(null);
    if (!recipientName.trim()) return setError("Nama penerima wajib diisi.");
    if (mode === "upload") {
      const message = validatePdfSelection(file);
      if (message) return setError(message);
    }
    setLoading(true);
    try {
      if (mode === "upload") {
        const message = await validatePdfHeader(file);
        if (message) return setError(message);
      }
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
      setRecipientName(""); setRecipientEmail(""); setData(""); setFile(null);
      if (res?.async) {
        // Mode antrian (Fase C-scale): mulai polling status job.
        setJobInfo({ status: res.status || "queued", certificateId: res.certificateId });
        setJobId(res.jobId);
        toast.success("Sertifikat sedang diproses", "Dirender & dicatat di latar.");
      } else {
        setResult(res);
        toast.success("Sertifikat diterbitkan", "Tercatat di blockchain.");
      }
    } catch (err) {
      toast.error("Penerbitan gagal", err.message);
    } finally {
      setLoading(false);
    }
  }

  // Fase C3: PDF generated bersifat privat (tanpa fileUrl publik) -> unduh lewat
  // endpoint terotentikasi (issuer adalah anggota org penerbit).
  async function downloadResult() {
    setDlBusy(true);
    try {
      const blob = await apiBlob(`/v1/certificates/${result.certificateId}/download`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificate-${result.certificateId.slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Gagal mengunduh PDF", err.message);
    } finally {
      setDlBusy(false);
    }
  }

  const tab = (key, label, Icon) => (
    <button
      type="button"
      disabled={loading}
      onClick={() => { setMode(key); setError(null); }}
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
        description="Unggah PDF asli untuk diterbitkan, atau buat PDF baru dari template."
      />

      {result ? (
        <motion.div initial={{ opacity: 0, scale: reduce ? 1 : 0.96, y: reduce ? 0 : 10 }} animate={{ opacity: 1, scale: 1, y: 0, transition: springPop }}>
        <Card>
          <Alert type="success" title="Sertifikat berhasil diterbitkan">Bagikan QR atau link verifikasi di bawah.</Alert>
          {result.signed && <div className="mt-3"><Badge tone="brand" icon={FileSignature}>Ditandatangani digital (PAdES)</Badge></div>}
          <div className="mt-4 grid gap-5 sm:grid-cols-[170px_1fr] sm:items-start">
            {result.qrCode && (
              <motion.div
                initial={{ opacity: 0, scale: reduce ? 1 : 0.9 }}
                animate={{ opacity: 1, scale: 1, transition: { ...springPop, delay: 0.12 } }}
                className="flex flex-col items-center gap-2"
              >
                <img src={result.qrCode} alt="QR" className="h-40 w-40 rounded-xl border border-line bg-white p-2" />
                <a href={result.qrCode} download={`qr-${result.certificateId.slice(0, 10)}.png`} className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline">
                  <Download className="h-3.5 w-3.5" /> Unduh QR
                </a>
              </motion.div>
            )}
            <div className="space-y-3">
              <CopyField label="Certificate ID" value={result.certificateId} />
              {result.verificationUrl && <CopyField label="Link verifikasi" value={result.verificationUrl} />}
              {resultFileUrl ? (
                <a href={resultFileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-brand hover:underline">
                  <ExternalLink className="h-4 w-4" /> Buka PDF sertifikat
                </a>
              ) : result.fileCid ? (
                <button type="button" onClick={downloadResult} disabled={dlBusy} className="inline-flex items-center gap-1.5 text-sm text-brand hover:underline disabled:opacity-50">
                  <Download className="h-4 w-4" /> {dlBusy ? "Mengunduh…" : "Unduh PDF sertifikat"}
                </button>
              ) : null}
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button icon={ExternalLink} onClick={() => navigate(`/verify/${result.certificateId}`)}>Buka halaman verifikasi</Button>
            <Button variant="secondary" icon={RotateCcw} onClick={() => setResult(null)}>Terbitkan lagi</Button>
          </div>
        </Card>
        </motion.div>
      ) : jobInfo?.status === "failed" ? (
        <Card>
          <Alert type="error" title="Render sertifikat gagal">
            {jobInfo.lastError || "Job tidak dapat diselesaikan."}
            {jobInfo.attempts ? ` (setelah ${jobInfo.attempts} percobaan)` : ""}
          </Alert>
          <div className="mt-4">
            <Button variant="secondary" icon={RotateCcw} onClick={() => { setJobId(null); setJobInfo(null); }}>Kembali ke form</Button>
          </div>
        </Card>
      ) : jobId ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-brand motion-reduce:animate-none" strokeWidth={2} />
            <div>
              <p className="text-base font-semibold text-fg">Sedang memproses sertifikat</p>
              <p className="mt-1 text-sm text-fg-muted">
                {jobInfo?.status === "processing" ? "Merender PDF & mencatat ke blockchain…" : "Menunggu giliran di antrian…"}
              </p>
            </div>
            {/* Bilah progres indeterminate (transform-only); mati saat reduced motion */}
            {!reduce && (
              <div className="h-1 w-48 overflow-hidden rounded-full bg-surface-hover" aria-hidden="true">
                <motion.div
                  className="h-full w-1/3 rounded-full bg-brand"
                  animate={{ x: ["-110%", "310%"] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
            )}
            <Badge tone={jobInfo?.status === "processing" ? "brand" : "neutral"} dot>
              {jobInfo?.status === "processing" ? "Dirender" : "Dalam antrian"}
              {jobInfo?.attempts > 1 ? ` · percobaan ${jobInfo.attempts}` : ""}
            </Badge>
            {jobInfo?.certificateId && (
              <p className="break-all font-mono text-xs text-fg-faint">{jobInfo.certificateId}</p>
            )}
            <p className="max-w-sm text-xs text-fg-faint">Halaman memperbarui otomatis. Anda boleh meninggalkan halaman ini — proses tetap berjalan di latar.</p>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="mb-4 flex gap-1 rounded-xl bg-app p-1">
            {tab("upload", "Unggah PDF asli", Upload)}
            {tab("generate", "Buat PDF dari template", Sparkles)}
          </div>
          <form onSubmit={submit} className="space-y-4">
            {error && <Alert type="error">{error}</Alert>}
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField id="recipientName" label="Nama penerima" required placeholder="mis. Budi Santoso" value={recipientName} onChange={(e) => setRecipientName(e.target.value)} disabled={loading} />
              <TextField id="recipientEmail" label="Email penerima" type="email" helper="Agar penerima bisa melihatnya di akunnya." placeholder="budi@email.com" value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} disabled={loading} />
            </div>

            {mode === "generate" ? (
              <div>
                <p className="mb-3 text-sm text-fg-muted">Mode ini membuat dokumen PDF baru menggunakan desain template yang dipilih.</p>
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
              <FileField id="file" label="PDF sertifikat asli" required accept=".pdf,application/pdf" fileName={file?.name} onChange={selectPdf} disabled={loading} helper="Hanya PDF, maksimal 10 MB. File diterbitkan persis seperti yang Anda unggah." />
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
