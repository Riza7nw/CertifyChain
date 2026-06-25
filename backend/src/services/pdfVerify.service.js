// src/services/pdfVerify.service.js
// Verifikasi anti-tamper PDF (Fase B): user mengunggah PDF, sistem menghitung ulang
// CID byte + keccak256, lalu mencocokkan ke catatan (read-model + on-chain).
// Cocok = byte persis seperti saat diterbitkan (tak diubah). Tak cocok = dipalsukan/diubah.

const blockchainService = require("./blockchain.service");
const storage = require("../storage");
const db = require("../db");
const { keccak256Bytes } = require("../utils/hash");
const { PDFDocument } = require("pdf-lib");

const HEX64 = /0x[0-9a-fA-F]{64}/;

// Coba ambil certId dari metadata PDF (Keywords 'certId:0x…' / Subject verifyUrl).
async function extractCertId(buffer) {
  try {
    const doc = await PDFDocument.load(buffer, { updateMetadata: false });
    const blob = `${doc.getKeywords() || ""} ${doc.getSubject() || ""}`;
    const m = blob.match(HEX64);
    return m ? m[0] : null;
  } catch {
    return null;
  }
}

async function verifyPdf(buffer) {
  const certId = await extractCertId(buffer);
  const computedCid = storage.computeCid ? await storage.computeCid(buffer) : null;
  const keccak = keccak256Bytes(buffer);

  // Identifikasi sertifikat: lewat certId metadata, atau cocokkan CID ke read-model.
  let cert = certId ? await db.certificates.get(certId) : null;
  if (!cert && computedCid && db.certificates.findByFileCid) {
    cert = await db.certificates.findByFileCid(computedCid);
  }

  if (!cert) {
    return { match: false, status: "UNKNOWN", message: "PDF tidak dikenali sebagai sertifikat CertifyChain." };
  }

  // Cross-check on-chain (best-effort; sumber kebenaran fileCid).
  let onChainValid = false;
  let onChainFileCid = null;
  try { onChainValid = await blockchainService.verifyCertificate(cert.certificate_id); } catch { /* RPC/absen */ }
  try { onChainFileCid = (await blockchainService.getCertificate(cert.certificate_id)).fileCid; } catch { /* absen */ }

  const expectedCid = onChainFileCid || cert.file_cid;
  const cidMatch = !!(computedCid && expectedCid && computedCid === expectedCid);
  const hashMatch = !!(cert.pdf_hash && keccak === cert.pdf_hash);
  const byteMatch = cidMatch || hashMatch;

  const institution = cert.institution_id != null ? await db.institutions.get(cert.institution_id) : null;

  return {
    match: byteMatch,
    tampered: !byteMatch,
    onChainValid,
    certificateId: cert.certificate_id,
    recipientName: cert.recipient_name || null,
    institutionName: institution?.name || null,
    issuedAt: cert.issued_at || null,
    status: cert.status,
    computedCid,
    expectedCid,
    message: byteMatch
      ? onChainValid
        ? "PDF asli & terverifikasi on-chain."
        : "PDF cocok dengan catatan penerbitan, namun status on-chain tidak aktif/tak terverifikasi."
      : "PDF TIDAK cocok dengan catatan — kemungkinan telah diubah.",
  };
}

module.exports = { verifyPdf };
