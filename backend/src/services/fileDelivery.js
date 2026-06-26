// src/services/fileDelivery.js
// Pengiriman file sertifikat untuk endpoint UNDUHAN akses-terkontrol (Fase C3).
// Dipakai bersama oleh /api/v1/me/.../download (penerima) dan
// /api/v1/certificates/:id/download (staf) agar logikanya tidak terduplikasi.
//
//   - provider lokal (dev): file ada di disk -> kirim sebagai attachment.
//   - provider IPFS/Pinata: tak ada file lokal -> arahkan ke gateway.

const storage = require("../storage");

function sendCertificateFile(res, cert) {
  // Generated = PDF; uploaded = ekstensi asli tak tersimpan di read-model -> tanpa ekstensi.
  const ext = cert.artifact_type === "generated" ? ".pdf" : "";
  const filename = `certificate-${cert.certificate_id}${ext}`;

  if (typeof storage.getPath === "function" && storage.exists?.(cert.file_cid)) {
    return res.sendFile(storage.getPath(cert.file_cid), {
      headers: { "Content-Disposition": `attachment; filename="${filename}"` },
    });
  }
  return res.redirect(storage.gatewayUrl(cert.file_cid));
}

module.exports = { sendCertificateFile };
