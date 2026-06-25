// src/services/certificate.service.js
// Inti penerbitan sertifikat (file -> hash -> chain -> read-model -> QR).
// Dua mode:
//   - upload   : issuer mengunggah file (alur lama)
//   - generate : platform merender PDF dari template (Fase A), QR ditanam di PDF
//                SEBELUM hashing -> certId dibuat lebih dulu.

const blockchainService = require("./blockchain.service");
const qrService = require("./qr.service");
const audit = require("./audit.service");
const pdf = require("../pdf");
const storage = require("../storage");
const db = require("../db");
const { generateDataHash, generateCertificateId, keccak256Bytes } = require("../utils/hash");

/**
 * Pipeline bersama: simpan file -> dataHash -> on-chain -> read-model -> QR.
 * @param {object} p
 * @param {string} [p.certificateId]  bila sudah dibuat di luar (mode generate); default acak
 * @param {string} [p.artifactType]   'uploaded' | 'generated'
 * @param {string} [p.templateKey]    key template (mode generate)
 * @param {string} [p.pdfHash]        keccak256 byte PDF (mode generate)
 * @param {string} [p.issuedAtIso]    timestamp ISO (agar konsisten dgn isi PDF)
 */
async function issueToInstitution({
  institutionId,
  recipientName,
  recipientEmail,
  data,
  fileBuffer,
  fileName,
  mimeType,
  issuedByLabel,
  ip,
  certificateId,
  artifactType = "uploaded",
  templateKey = null,
  pdfHash = null,
  issuedAtIso,
}) {
  // 1. Simpan file -> storage (CID = hash konten = jangkar anti-tamper)
  const stored = await storage.add(fileBuffer, fileName);

  // 2. Metadata kanonik -> dataHash (urutan field tetap agar deterministik)
  const canonical = JSON.stringify({
    institutionId,
    recipientName: recipientName.trim(),
    fileCid: stored.cid,
    fileName,
    mimeType: mimeType ?? null,
    extra: data ?? null,
  });
  const dataHash = generateDataHash(canonical);
  const certId = certificateId || generateCertificateId();
  const issuedAt = issuedAtIso || new Date().toISOString();

  // 3. Catat ke blockchain (dataHash + fileCid)
  const receipt = await blockchainService.issueCertificate(institutionId, certId, dataHash, stored.cid);

  // 4. Read-model (dashboard cepat)
  await db.certificates.upsert({
    certificateId: certId,
    institutionId,
    recipientName: recipientName.trim(),
    recipientEmail: recipientEmail ? String(recipientEmail).trim().toLowerCase() : null,
    fileCid: stored.cid,
    dataHash,
    status: "valid",
    txHash: receipt.txHash,
    blockNumber: receipt.blockNumber,
    issuedAt,
    artifactType,
    templateKey,
    pdfHash,
    signed: false,
    renderStatus: "done",
  });

  audit.record({ type: "CERTIFICATE_ISSUED", admin: issuedByLabel, ip, institutionId, certificateId: certId, fileCid: stored.cid, dataHash, txHash: receipt.txHash, artifactType });

  const verificationUrl = qrService.buildVerificationUrl(certId);
  const qrCode = await qrService.generateQrDataUrl(verificationUrl);

  return {
    certificateId: certId,
    institutionId,
    recipientName: recipientName.trim(),
    fileCid: stored.cid,
    fileUrl: storage.gatewayUrl(stored.cid),
    dataHash,
    pdfHash,
    artifactType,
    templateKey,
    verificationUrl,
    qrCode,
    transaction: receipt,
  };
}

/**
 * Mode GENERATE: render PDF dari template lalu lewatkan ke pipeline bersama.
 * QR ditanam di PDF -> certId harus dibuat dulu.
 */
async function issueGenerated({ institutionId, institutionName, recipientName, recipientEmail, data, templateKey, issuedByLabel, ip }) {
  const certificateId = generateCertificateId();
  const issuedAtIso = new Date().toISOString();
  const issuedAtLabel = new Date(issuedAtIso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

  const { buffer, templateKey: usedTemplate } = await pdf.generateCertificatePdf({
    templateKey: templateKey || undefined,
    certificateId,
    recipientName: recipientName.trim(),
    institutionName: institutionName || null,
    issuedAt: issuedAtLabel,
    body: data || null,
  });

  const pdfHash = keccak256Bytes(buffer);

  return issueToInstitution({
    institutionId,
    recipientName,
    recipientEmail,
    data,
    fileBuffer: buffer,
    fileName: `${certificateId}.pdf`,
    mimeType: "application/pdf",
    issuedByLabel,
    ip,
    certificateId,
    artifactType: "generated",
    templateKey: usedTemplate,
    pdfHash,
    issuedAtIso,
  });
}

module.exports = { issueToInstitution, issueGenerated, listTemplates: pdf.listTemplates };
