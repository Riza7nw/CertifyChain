import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import Alert from "../components/Alert";
import Spinner from "../components/Spinner";
import CopyField from "../components/CopyField";
import { TextField, TextAreaField, SelectField, FileField } from "../components/Field";
import { issueCertificate, listInstitutions } from "../api/certificateApi";

const EMPTY = { institutionId: "", recipientName: "", data: "" };
const ACCEPT = ".pdf,image/*,application/pdf";
const MAX_BYTES = 10 * 1024 * 1024; // selaras dengan limit multer backend

export default function IssueCertificate() {
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // Daftar institusi untuk dropdown (sumber: GET /institutions)
  const [institutions, setInstitutions] = useState([]);
  const [instLoading, setInstLoading] = useState(true);
  const [instError, setInstError] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const items = await listInstitutions();
        if (active) setInstitutions(items || []);
      } catch (err) {
        if (active) setInstError(err.message);
      } finally {
        if (active) setInstLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  function handleChange(e) {
    const { id, value } = e.target;
    setForm((prev) => ({ ...prev, [id]: value }));
  }

  function handleFileChange(e) {
    setFile(e.target.files?.[0] || null);
  }

  // Validasi sederhana di sisi client sebelum hit API
  function validate() {
    if (!form.institutionId) return "Pilih institusi penerbit terlebih dahulu.";
    if (!form.recipientName.trim()) return "Nama penerima wajib diisi.";
    if (!file) return "File sertifikat (PDF/gambar) wajib diunggah.";
    if (file.size > MAX_BYTES) return "Ukuran file melebihi batas 10 MB.";
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setResult(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      // multipart/form-data: field `file` + `recipientName` + `data` (opsional)
      const fd = new FormData();
      fd.append("file", file);
      fd.append("recipientName", form.recipientName.trim());
      if (form.data.trim()) fd.append("data", form.data.trim());

      const data = await issueCertificate(form.institutionId, fd);
      setResult(data);
      setForm((prev) => ({ ...EMPTY, institutionId: prev.institutionId })); // pertahankan institusi terpilih
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
        <h1 className="text-2xl font-bold text-slate-900">Issue Certificate</h1>
        <p className="mt-1 text-sm text-slate-500">
          Unggah file sertifikat atas nama sebuah institusi. File disimpan di IPFS, lalu hash &amp; CID
          dicatat ke blockchain.
        </p>
      </div>

      {/* Hasil sukses */}
      {result && (
        <Card className="animate-fade-in border-emerald-200">
          <Alert type="success" title="Sertifikat berhasil diterbitkan!">
            Bagikan QR Code di bawah — siapa pun bisa memindainya untuk verifikasi.
          </Alert>

          <div className="mt-4 grid gap-5 sm:grid-cols-[180px,1fr] sm:items-start">
            {/* QR Code */}
            {result.qrCode && (
              <div className="flex flex-col items-center gap-2">
                <img
                  src={result.qrCode}
                  alt="QR Code verifikasi sertifikat"
                  className="h-44 w-44 rounded-xl border border-slate-200 bg-white p-2"
                />
                <a
                  href={result.qrCode}
                  download={`certifychain-qr-${result.certificateId.slice(0, 10)}.png`}
                  className="text-xs font-semibold text-brand-600 hover:underline"
                >
                  ⬇ Unduh QR Code
                </a>
              </div>
            )}

            {/* Detail */}
            <div className="space-y-3">
              <CopyField label="Certificate ID" value={result.certificateId} />
              {result.verificationUrl && (
                <CopyField label="Link Verifikasi (isi QR)" value={result.verificationUrl} />
              )}
              <CopyField label="Data Hash" value={result.dataHash} />
              {result.fileCid && <CopyField label="File CID (IPFS)" value={result.fileCid} />}
              {result.fileUrl && (
                <a
                  href={result.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline"
                >
                  📄 Lihat file sertifikat
                </a>
              )}
              {result.transaction?.txHash && (
                <CopyField label="Transaction Hash" value={result.transaction.txHash} />
              )}
              {result.transaction?.blockNumber != null && (
                <p className="text-xs text-slate-500">
                  Block #{result.transaction.blockNumber} • Gas used: {result.transaction.gasUsed}
                </p>
              )}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={() => navigate(`/verify/${result.certificateId}`)} variant="primary">
              Buka halaman verifikasi publik
            </Button>
            <Button onClick={() => setResult(null)} variant="secondary">
              Terbitkan lagi
            </Button>
          </div>
        </Card>
      )}

      {/* Form */}
      {!result && (
        <Card title="Detail Sertifikat">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <Alert type="error">{error}</Alert>}
            {instError && (
              <Alert type="warning">Gagal memuat daftar institusi: {instError}</Alert>
            )}

            <SelectField
              id="institutionId"
              label="Institusi Penerbit"
              value={form.institutionId}
              onChange={handleChange}
              disabled={loading || instLoading}
              helper={
                !instLoading && institutions.length === 0
                  ? "Belum ada institusi terdaftar. Daftarkan dulu di halaman Institusi."
                  : "Pilih institusi yang menerbitkan sertifikat ini."
              }
            >
              <option value="">
                {instLoading ? "Memuat institusi…" : "— Pilih institusi —"}
              </option>
              {institutions.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name} (#{inst.id})
                </option>
              ))}
            </SelectField>

            <TextField
              id="recipientName"
              label="Nama Penerima"
              placeholder="mis. Budi Santoso"
              value={form.recipientName}
              onChange={handleChange}
              disabled={loading}
            />

            <FileField
              id="file"
              label="File Sertifikat"
              accept={ACCEPT}
              onChange={handleFileChange}
              disabled={loading}
              fileName={file?.name}
              helper="PDF atau gambar, maksimal 10 MB. File akan dipin ke IPFS."
            />

            <TextAreaField
              id="data"
              label="Data / Metadata Tambahan (opsional)"
              placeholder="mis. Sarjana Teknik Informatika — Cumlaude — 2026"
              helper="Disertakan ke dalam hash integritas (keccak256) bersama metadata file."
              value={form.data}
              onChange={handleChange}
              disabled={loading}
            />

            <div className="flex justify-end pt-2">
              <Button type="submit" loading={loading} disabled={instLoading}>
                {loading ? "Memproses transaksi..." : "Issue Certificate"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Loading awal daftar institusi saat form belum siap */}
      {!result && instLoading && (
        <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
          <Spinner className="h-4 w-4" /> Memuat daftar institusi…
        </div>
      )}
    </div>
  );
}
