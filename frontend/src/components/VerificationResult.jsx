import { BadgeCheck, ShieldX, FileText } from "lucide-react";
import Card from "./Card";
import Badge from "./Badge";
import CopyField from "./CopyField";

// Hasil verifikasi sertifikat (Phase 8 / Fase 3) — dipakai bersama halaman publik
// (/verify/:id) & internal (/verify). detail = gabungan on-chain + read-model.
function Row({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-line py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="text-sm text-fg-muted">{label}</span>
      <span className="break-all text-sm font-medium text-fg sm:text-right">{children}</span>
    </div>
  );
}

export default function VerificationResult({ valid, detail }) {
  return (
    <div className="space-y-5">
      <div className={`flex flex-col items-center gap-2 rounded-2xl border border-line px-6 py-8 text-center ${valid ? "bg-success-subtle" : "bg-danger-subtle"}`}>
        <div className={`flex h-16 w-16 items-center justify-center rounded-full text-white ${valid ? "bg-success" : "bg-danger"}`}>
          {valid ? <BadgeCheck className="h-9 w-9" strokeWidth={2} /> : <ShieldX className="h-9 w-9" strokeWidth={2} />}
        </div>
        <p className={`text-xl font-semibold ${valid ? "text-success-fg" : "text-danger-fg"}`}>
          {valid ? "Sertifikat terverifikasi" : "Sertifikat tidak valid"}
        </p>
        <p className={`max-w-sm text-sm ${valid ? "text-success-fg" : "text-danger-fg"}`}>
          {valid ? "Sertifikat ini asli dan tercatat di blockchain." : "Sertifikat tidak ditemukan atau telah dicabut."}
        </p>
      </div>

      {detail && (
        <Card title="Detail sertifikat">
          <div className="rounded-xl bg-app px-4">
            <Row label="Nama penerima">{detail.recipientName || "—"}</Row>
            <Row label="Institusi penerbit">{detail.institutionName || "—"}</Row>
            <Row label="Status">{detail.isValid ? <Badge tone="success" dot>Aktif</Badge> : <Badge tone="danger" dot>Dicabut</Badge>}</Row>
            <Row label="Diterbitkan">{detail.issuedAt ? new Date(detail.issuedAt).toLocaleString("id-ID") : "—"}</Row>
            {detail.fileUrl && (
              <Row label="File sertifikat">
                <a href={detail.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-brand hover:underline">
                  <FileText className="h-4 w-4" /> Buka file (IPFS)
                </a>
              </Row>
            )}
          </div>
          <div className="mt-4 space-y-3">
            {detail.dataHash && <CopyField label="Data hash" value={detail.dataHash} />}
            <CopyField label="Certificate ID" value={detail.certificateId} />
          </div>
        </Card>
      )}
    </div>
  );
}
