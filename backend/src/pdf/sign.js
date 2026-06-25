// src/pdf/sign.js
// Tanda tangan digital PAdES (PKCS#7) ke dalam PDF (Fase C2). Opt-in via env
// PDF_SIGN_ENABLED + sertifikat P12 (lihat scripts/gen-sign-cert.js).
// Bila nonaktif / sertifikat tak ada -> kembalikan null (caller pakai PDF tanpa tanda tangan).

const fs = require("fs");
const config = require("../config");
const signpdf = require("@signpdf/signpdf").default;
const { P12Signer } = require("@signpdf/signer-p12");
const { plainAddPlaceholder } = require("@signpdf/placeholder-plain");

let _p12; // cache buffer P12
let _warned = false;

function loadP12() {
  if (_p12 !== undefined) return _p12;
  try {
    _p12 = fs.readFileSync(config.pdfSign.p12Path);
  } catch {
    _p12 = null;
    if (!_warned) {
      console.warn(`[pdf.sign] P12 tak ditemukan di ${config.pdfSign.p12Path} — PDF tidak ditandatangani. Jalankan: npm run gen-sign-cert`);
      _warned = true;
    }
  }
  return _p12;
}

/**
 * @param {Buffer} pdfBuffer  PDF final (sudah ber-metadata)
 * @returns {Promise<Buffer|null>} PDF ber-tanda-tangan, atau null bila signing nonaktif/gagal
 */
async function signPdf(pdfBuffer) {
  if (!config.pdfSign.enabled) return null;
  const p12 = loadP12();
  if (!p12) return null;
  try {
    const withPlaceholder = plainAddPlaceholder({
      pdfBuffer,
      reason: "Diterbitkan & diverifikasi oleh CertifyChain",
      name: "CertifyChain",
      location: "Blockchain",
      signatureLength: 8192,
    });
    const signer = new P12Signer(p12, { passphrase: config.pdfSign.passphrase });
    const signed = await signpdf.sign(withPlaceholder, signer);
    return Buffer.isBuffer(signed) ? signed : Buffer.from(signed);
  } catch (e) {
    console.error("[pdf.sign] gagal menandatangani PDF:", e.message);
    return null;
  }
}

module.exports = { signPdf, isEnabled: () => config.pdfSign.enabled };
