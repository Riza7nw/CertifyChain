// src/services/certificate.service.js
// Inti penerbitan sertifikat (file -> hash -> chain -> read-model -> QR).
// Dua mode:
//   - upload   : issuer mengunggah file (alur lama)
//   - generate : platform merender PDF dari template (Fase A), QR ditanam di PDF
//                SEBELUM hashing -> certId dibuat lebih dulu.

const blockchainService = require("./blockchain.service");
const qrService = require("./qr.service");
const audit = require("./audit.service");
const templateService = require("./template.service");
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
  signed = false,
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
    signed,
    renderStatus: "done",
  });

  audit.record({ type: "CERTIFICATE_ISSUED", admin: issuedByLabel, ip, institutionId, certificateId: certId, fileCid: stored.cid, dataHash, txHash: receipt.txHash, artifactType });

  const verificationUrl = qrService.buildVerificationUrl(certId);
  const qrCode = await qrService.generateQrDataUrl(verificationUrl);

  // Fase C3: PDF generated bersifat privat -> tak ada fileUrl publik; unduh lewat
  // endpoint terotentikasi. File uploaded tetap punya gateway URL publik.
  const privateFile = artifactType === "generated";

  return {
    certificateId: certId,
    institutionId,
    recipientName: recipientName.trim(),
    fileCid: stored.cid,
    fileUrl: privateFile ? null : storage.gatewayUrl(stored.cid),
    fileAccess: privateFile ? "private" : "public",
    dataHash,
    pdfHash,
    artifactType,
    templateKey,
    signed,
    verificationUrl,
    qrCode,
    transaction: receipt,
  };
}

/**
 * Render PDF dari template lalu lewatkan ke pipeline bersama. certId & issuedAtIso
 * diberikan dari LUAR agar render DETERMINISTIK (byte identik bila diulang) — penting
 * untuk antrian async/worker yang mungkin retry (Fase C-scale): certId ditetapkan saat
 * enqueue, issuedAtIso disimpan di payload. QR ditanam di PDF -> certId harus ada dulu.
 */
async function renderAndIssueGenerated({ certId, issuedAtIso, institutionId, institutionName, recipientName, recipientEmail, data, template, orgId, issuedByLabel, ip }) {
  const tpl = await templateService.resolve(template || "classic", orgId);
  const issuedAtLabel = new Date(issuedAtIso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

  const { buffer, signed, templateKey: usedTemplate } = await pdf.generateCertificatePdf({
    templateKey: tpl.key,
    accent: tpl.accent,
    certificateId: certId,
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
    fileName: `${certId}.pdf`,
    mimeType: "application/pdf",
    issuedByLabel,
    ip,
    certificateId: certId,
    artifactType: "generated",
    templateKey: usedTemplate,
    pdfHash,
    signed,
    issuedAtIso,
  });
}

/**
 * Mode GENERATE sinkron: buat certId + issuedAtIso baru lalu render & issue langsung.
 */
async function issueGenerated(args) {
  const certId = generateCertificateId();
  const issuedAtIso = new Date().toISOString();
  return renderAndIssueGenerated({ certId, issuedAtIso, ...args });
}

module.exports = { issueToInstitution, issueGenerated, renderAndIssueGenerated, listTemplates: pdf.listTemplates };
