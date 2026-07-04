import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { UploadCloud, BadgeCheck, ShieldX, FileQuestion, FileText, FileSignature } from "lucide-react";
import DrawnCheck from "../components/motion/DrawnCheck";
import { EASE, springPop } from "../lib/motion";
import Card from "../components/Card";
import Button from "../components/Button";
import Alert from "../components/Alert";
import Spinner from "../components/Spinner";
import Badge from "../components/Badge";
import { verifyPdfFile } from "../api/certificateApi";

function Verdict({ r }) {
  const reduce = useReducedMotion();
  const authentic = r.match;
  const unknown = r.status === "UNKNOWN";
  const tone = authentic ? "bg-success-subtle text-success-fg" : unknown ? "bg-warning-subtle text-warning-fg" : "bg-danger-subtle text-danger-fg";
  const Icon = authentic ? BadgeCheck : unknown ? FileQuestion : ShieldX;
  const title = authentic ? "Sertifikat asli" : unknown ? "Tidak dikenali" : "Sertifikat diubah";
  // Asli: spring scale + centang ter-draw. Diubah: shake halus sekali. Tak dikenali: fade.
  const shake = !authentic && !unknown && !reduce;

  return (
    <div className="space-y-5">
      <motion.div
        key={r.status || String(authentic)}
        initial={{ opacity: 0, scale: authentic && !reduce ? 0.94 : 1 }}
        animate={{ opacity: 1, scale: 1, ...(shake ? { x: [0, -6, 6, -3, 3, 0] } : {}) }}
        transition={authentic && !reduce ? springPop : { duration: 0.45, ease: EASE }}
        className={`flex flex-col items-center gap-2 rounded-2xl border border-line px-6 py-8 text-center ${tone}`}
      >
        <div className={`flex h-16 w-16 items-center justify-center rounded-full text-white ${authentic ? "bg-success" : unknown ? "bg-warning" : "bg-danger"}`}>
          {authentic && !reduce ? <DrawnCheck className="h-9 w-9" /> : <Icon className="h-9 w-9" strokeWidth={2} />}
        </div>
        <p className="text-xl font-semibold">{title}</p>
        <p className="max-w-md text-sm">{r.message}</p>
      </motion.div>

      {r.certificateId && (
        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE, delay: 0.15 }}
        >
        <Card title="Detail">
          <div className="rounded-xl bg-app px-4">
            <Row label="Nama penerima">{r.recipientName || "—"}</Row>
            <Row label="Institusi penerbit">{r.institutionName || "—"}</Row>
            <Row label="Status on-chain">{r.onChainValid ? <Badge tone="success" dot>Aktif</Badge> : <Badge tone="warning" dot>Tidak aktif</Badge>}</Row>
            {r.signed && <Row label="Tanda tangan digital"><Badge tone="brand" icon={FileSignature}>PAdES</Badge></Row>}
            <Row label="Certificate ID"><code className="font-mono text-xs">{r.certificateId}</code></Row>
          </div>
          <div className="mt-4">
            <Link to={`/verify/${r.certificateId}`}><Button variant="secondary" icon={FileText}>Lihat verifikasi on-chain</Button></Link>
          </div>
        </Card>
        </motion.div>
      )}
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-line py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="text-sm text-fg-muted">{label}</span>
      <span className="break-all text-sm font-medium text-fg sm:text-right">{children}</span>
    </div>
  );
}

export default function VerifyFile() {
  const inputRef = useRef(null);
  const [fileName, setFileName] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [drag, setDrag] = useState(false);

  async function handleFile(file) {
    if (!file) return;
    if (file.type && file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Hanya file PDF yang didukung.");
      return;
    }
    setFileName(file.name);
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      setResult(await verifyPdfFile(file));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-fg">Verifikasi dengan file</h1>
        <p className="mt-1 text-sm text-fg-muted">Unggah PDF sertifikat untuk memeriksa keasliannya (anti-tamper).</p>
      </div>

      <Card>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files?.[0]); }}
          className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
            drag ? "border-brand bg-brand-subtle" : "border-line-strong hover:bg-surface-hover"
          }`}
        >
          <UploadCloud className="h-8 w-8 text-fg-faint" strokeWidth={1.75} />
          <span className="text-sm font-medium text-fg">Jatuhkan PDF di sini, atau klik untuk memilih</span>
          {fileName && <span className="text-xs text-fg-faint">{fileName}</span>}
          <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] || null)} />
        </button>
      </Card>

      {error && <Alert type="error">{error}</Alert>}

      {loading && (
        <div className="flex items-center justify-center gap-3 py-8 text-fg-muted">
          <Spinner className="h-5 w-5" /><span className="text-sm">Memeriksa keaslian…</span>
        </div>
      )}

      {!loading && result && <Verdict r={result} />}
    </div>
  );
}
