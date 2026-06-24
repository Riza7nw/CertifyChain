// src/services/qr.service.js
// Membuat QR Code untuk sertifikat memakai library "qrcode" (npm).
//
// Kenapa "qrcode"? Library Node paling populer & matang untuk generate QR:
//   - bisa output ke Data URL (base64 PNG), Buffer PNG, atau SVG;
//   - mendukung level koreksi error (recovery) bila QR sebagian rusak;
//   - tanpa dependency native, ringan, mudah dipakai di server.
//
// PENTING soal keamanan: QR HANYA berisi link verifikasi + certificateId.
// QR bukan sumber kepercayaan — sumber kebenaran tetap data on-chain.
// Jadi tidak ada rahasia/tanda tangan yang bocor lewat QR.

const QRCode = require("qrcode");
const config = require("../config");

// Opsi standar QR: level "M" (recovery ~15%), margin & ukuran nyaman dipindai.
const QR_OPTIONS = {
  errorCorrectionLevel: "M",
  margin: 2,
  width: 320,
  color: { dark: "#0f172a", light: "#ffffff" },
};

/**
 * Membentuk URL halaman verifikasi publik untuk sebuah sertifikat.
 * Contoh: https://app.example.com/verify/0xabc...
 */
function buildVerificationUrl(certificateId) {
  return `${config.publicBaseUrl}/verify/${certificateId}`;
}

/** QR sebagai Data URL (base64 PNG) — enak ditaruh di <img src> / disimpan. */
function generateQrDataUrl(text) {
  return QRCode.toDataURL(text, QR_OPTIONS);
}

/** QR sebagai Buffer PNG — untuk dikirim langsung sebagai file gambar. */
function generateQrBuffer(text) {
  return QRCode.toBuffer(text, { ...QR_OPTIONS, type: "png" });
}

module.exports = { buildVerificationUrl, generateQrDataUrl, generateQrBuffer };
