// src/services/certificate.service.js
// Inti penerbitan sertifikat (IPFS -> hash -> chain -> read-model -> QR).
// Dipakai bersama oleh endpoint admin lama (/api/institutions/:id/certificates)
// dan endpoint org-scoped baru (/api/v1/orgs/:orgId/certificates).

const blockchainService = require("./blockchain.service");
const qrService = require("./qr.service");
const audit = require("./audit.service");
const storage = require("../storage");
const db = require("../db");
const { generateDataHash, generateCertificateId } = require("../utils/hash");

/**
 * @param {object} p
 * @param {number} p.institutionId  institusi penerbit (on-chain)
 * @param {string} p.recipientName
 * @param {string} [p.data]         metadata tambahan (opsional)
 * @param {Buffer} p.fileBuffer
 * @param {string} p.fileName
 * @param {string} [p.mimeType]
 * @param {string} [p.issuedByLabel] untuk audit log (username/email penerbit)
 * @param {string} [p.ip]
 * @returns {Promise<object>} data sertifikat (certId, cid, hash, qr, tx)
 */
async function issueToInstitution({ institutionId, recipientName, recipientEmail, data, fileBuffer, fileName, mimeType, issuedByLabel, ip }) {
  // 1. Unggah file -> IPFS
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
  const certificateId = generateCertificateId();

  // 3. Catat ke blockchain
  const receipt = await blockchainService.issueCertificate(institutionId, certificateId, dataHash, stored.cid);

  // 4. Read-model (dashboard cepat)
  await db.certificates.upsert({
    certificateId,
    institutionId,
    recipientName: recipientName.trim(),
    recipientEmail: recipientEmail ? String(recipientEmail).trim().toLowerCase() : null,
    fileCid: stored.cid,
    dataHash,
    status: "valid",
    txHash: receipt.txHash,
    blockNumber: receipt.blockNumber,
    issuedAt: new Date().toISOString(),
  });

  audit.record({ type: "CERTIFICATE_ISSUED", admin: issuedByLabel, ip, institutionId, certificateId, fileCid: stored.cid, dataHash, txHash: receipt.txHash });

  const verificationUrl = qrService.buildVerificationUrl(certificateId);
  const qrCode = await qrService.generateQrDataUrl(verificationUrl);

  return {
    certificateId,
    institutionId,
    recipientName: recipientName.trim(),
    fileCid: stored.cid,
    fileUrl: storage.gatewayUrl(stored.cid),
    dataHash,
    verificationUrl,
    qrCode,
    transaction: receipt,
  };
}

module.exports = { issueToInstitution };
