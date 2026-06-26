// src/services/renderQueue.service.js
// Fase C-scale — orkestrasi antrian render PDF async (Postgres-backed).
//   enqueueGenerate : dipanggil endpoint generate (mode async) -> buat certId +
//                     enqueue job 'queued', balas cepat (non-blocking).
//   processJob      : dipanggil WORKER -> render PDF + issue on-chain + read-model.
//                     IDEMPOTEN: bila certId sudah tercatat (retry pasca-crash),
//                     tidak menerbitkan ulang on-chain.
//   getStatus       : status job untuk polling frontend (+ hasil saat done).

const db = require("../db");
const renderJobs = require("../db/renderJobs.repo");
const certificateService = require("./certificate.service");
const qrService = require("./qr.service");
const blockchainService = require("./blockchain.service");
const { generateCertificateId } = require("../utils/hash");

/** Enqueue job generate. Mengembalikan { jobId, certificateId, status }. */
async function enqueueGenerate({ institutionId, institutionName, organizationId, recipientName, recipientEmail, data, template, issuedByLabel, ip, maxAttempts }) {
  const certificateId = generateCertificateId();
  const issuedAtIso = new Date().toISOString();

  const payload = {
    recipientName: String(recipientName).trim(),
    recipientEmail: recipientEmail || null,
    data: data || null,
    template: template || "classic",
    institutionName: institutionName || null,
    issuedByLabel: issuedByLabel || null,
    ip: ip || null,
    issuedAtIso,
    orgId: organizationId ?? null,
  };

  const job = await renderJobs.enqueue({
    certificateId,
    organizationId: organizationId ?? null,
    institutionId,
    payload,
    maxAttempts,
  });

  return { jobId: job.id, certificateId, status: job.status };
}

/**
 * Proses 1 job (dipanggil worker). Mengembalikan ringkasan hasil untuk markDone.
 * Lempar error bila gagal -> worker memutuskan requeue/failed.
 */
async function processJob(job) {
  const certId = job.certificate_id;

  // Idempotensi: bila sudah tercatat di read-model (retry setelah sukses sebagian),
  // jangan terbitkan ulang on-chain. Bentuk ulang ringkasan hasil dari read-model.
  const existing = await db.certificates.get(certId);
  if (existing) {
    const verificationUrl = qrService.buildVerificationUrl(certId);
    return {
      reused: true,
      certificateId: certId,
      fileCid: existing.file_cid,
      fileAccess: existing.artifact_type === "generated" ? "private" : "public",
      signed: !!existing.signed,
      verificationUrl,
      transaction: { txHash: existing.tx_hash || null },
    };
  }

  const p = job.payload || {};
  const result = await certificateService.renderAndIssueGenerated({
    certId,
    issuedAtIso: p.issuedAtIso,
    institutionId: job.institution_id,
    institutionName: p.institutionName,
    recipientName: p.recipientName,
    recipientEmail: p.recipientEmail,
    data: p.data,
    template: p.template,
    orgId: p.orgId,
    issuedByLabel: p.issuedByLabel,
    ip: p.ip,
  });
  return result;
}

/** Status job untuk endpoint polling. Saat done, sertakan hasil + QR (di-regen). */
async function getStatus(jobId) {
  const job = await renderJobs.getById(jobId);
  if (!job) return null;

  const base = {
    jobId: job.id,
    certificateId: job.certificate_id,
    organizationId: job.organization_id,
    status: job.status, // queued | processing | done | failed
    attempts: job.attempts,
    maxAttempts: job.max_attempts,
    lastError: job.last_error || null,
    createdAt: job.created_at,
    updatedAt: job.updated_at,
  };

  if (job.status === "done") {
    const r = job.result || {};
    const verificationUrl = r.verificationUrl || qrService.buildVerificationUrl(job.certificate_id);
    let qrCode = null;
    try { qrCode = await qrService.generateQrDataUrl(verificationUrl); } catch { /* abaikan */ }
    base.result = {
      certificateId: job.certificate_id,
      verificationUrl,
      fileCid: job.file_cid || r.fileCid || null,
      fileAccess: r.fileAccess || "private",
      signed: !!r.signed,
      txHash: job.tx_hash || r.txHash || null,
      qrCode,
    };
  }
  return base;
}

/** Verifikasi on-chain status (dipakai opsional oleh worker untuk audit). */
async function isOnChain(certId) {
  try { return await blockchainService.verifyCertificate(certId); } catch { return false; }
}

module.exports = { enqueueGenerate, processJob, getStatus, isOnChain };
