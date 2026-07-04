import { BadgeCheck, ShieldX, FileText } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import Card from "./Card";
import Badge from "./Badge";
import CopyField from "./CopyField";
import DrawnCheck from "./motion/DrawnCheck";
import { EASE, springPop } from "../lib/motion";

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
  const reduce = useReducedMotion();
  // Sukses: spring scale + centang ter-draw. Gagal: shake halus sekali.
  return (
    <div className="space-y-5">
      <motion.div
        key={valid ? "valid" : "invalid"}
        initial={{ opacity: 0, scale: valid && !reduce ? 0.94 : 1 }}
        animate={{ opacity: 1, scale: 1, ...(!valid && !reduce ? { x: [0, -6, 6, -3, 3, 0] } : {}) }}
        transition={valid && !reduce ? springPop : { duration: 0.45, ease: EASE }}
        className={`flex flex-col items-center gap-2 rounded-2xl border border-line px-6 py-8 text-center ${valid ? "bg-success-subtle" : "bg-danger-subtle"}`}
      >
        <div className={`flex h-16 w-16 items-center justify-center rounded-full text-white ${valid ? "bg-success" : "bg-danger"}`}>
          {valid ? (
            reduce ? <BadgeCheck className="h-9 w-9" strokeWidth={2} /> : <DrawnCheck className="h-9 w-9" />
          ) : (
            <ShieldX className="h-9 w-9" strokeWidth={2} />
          )}
        </div>
        <p className={`text-xl font-semibold ${valid ? "text-success-fg" : "text-danger-fg"}`}>
          {valid ? "Sertifikat terverifikasi" : "Sertifikat tidak valid"}
        </p>
        <p className={`max-w-sm text-sm ${valid ? "text-success-fg" : "text-danger-fg"}`}>
          {valid ? "Sertifikat ini asli dan tercatat di blockchain." : "Sertifikat tidak ditemukan atau telah dicabut."}
        </p>
      </motion.div>

      {detail && (
        <motion.div
          initial={{ opacity: 0, y: reduce ? 0 : 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE, delay: 0.15 }}
        >
        <Card title="Detail sertifikat">
          <div className="rounded-xl bg-app px-4">
            <Row label="Nama penerima">{detail.recipientName || "—"}</Row>
            <Row label="Institusi penerbit">{detail.institutionName || "—"}</Row>
            <Row label="Status">{detail.isValid ? <Badge tone="success" dot>Aktif</Badge> : <Badge tone="danger" dot>Dicabut</Badge>}</Row>
            <Row label="Diterbitkan">{detail.issuedAt ? new Date(detail.issuedAt).toLocaleString("id-ID") : "—"}</Row>
            {detail.fileUrl ? (
              <Row label="File sertifikat">
                <a href={detail.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-brand hover:underline">
                  <FileText className="h-4 w-4" /> Buka file (IPFS)
                </a>
              </Row>
            ) : detail.fileAccess === "private" ? (
              <Row label="File sertifikat">
                <span className="text-fg-faint">Privat — masuk sebagai penerima untuk mengunduh</span>
              </Row>
            ) : null}
          </div>
          <div className="mt-4 space-y-3">
            {detail.dataHash && <CopyField label="Data hash" value={detail.dataHash} />}
            <CopyField label="Certificate ID" value={detail.certificateId} />
          </div>
        </Card>
        </motion.div>
      )}
    </div>
  );
}
