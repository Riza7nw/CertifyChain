// src/utils/certPrivacy.js
// Kebijakan privasi file sertifikat (Fase C3) — satu sumber kebenaran.
//
// Sebuah file sertifikat bersifat PRIVAT bila PDF-nya DIRENDER oleh platform
// (artifact_type = 'generated'): isinya memuat PII penerima yang ditata server,
// jadi tak boleh disajikan endpoint file publik (/api/files/:cid) maupun
// dibocorkan lewat fileUrl di respons publik. Akses hanya lewat unduhan
// terotentikasi (penerima via /me, staf via /v1/certificates/:id/download).
//
// File yang DIUNGGAH issuer (artifact_type = 'uploaded') tetap publik seperti
// perilaku lama — issuer secara eksplisit memilih mengunggah artefak itu.
function isPrivateCert(cert) {
  return !!cert && cert.artifact_type === "generated";
}

module.exports = { isPrivateCert };
