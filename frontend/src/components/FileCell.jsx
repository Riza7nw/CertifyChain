import { useState } from "react";
import { FileText, Download, Loader2 } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "./Toast";

// Sel "File" untuk tabel sertifikat (Fase C3).
//  - file uploaded (publik)  -> tautan langsung ke fileUrl.
//  - file generated (privat) -> tombol unduh terotentikasi via
//    GET /v1/certificates/:id/download (staf: admin / anggota org penerbit).
export default function FileCell({ cert }) {
  const { apiBlob } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  if (cert.fileUrl) {
    return (
      <a
        href={cert.fileUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex text-brand hover:text-brand-hover"
        aria-label="Buka file"
      >
        <FileText className="h-4 w-4" />
      </a>
    );
  }

  if (!cert.fileCid) return <span className="text-fg-faint">—</span>;

  async function download() {
    setBusy(true);
    try {
      const blob = await apiBlob(`/v1/certificates/${cert.certificateId}/download`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `certificate-${cert.certificateId.slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error("Gagal mengunduh file", e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={download}
      disabled={busy}
      className="inline-flex text-brand hover:text-brand-hover disabled:opacity-50"
      aria-label="Unduh file (privat)"
      title="Unduh PDF (privat)"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
    </button>
  );
}
