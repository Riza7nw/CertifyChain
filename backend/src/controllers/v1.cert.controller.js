// src/controllers/v1.cert.controller.js
// Fase C3 — unduhan sertifikat akses-terkontrol untuk STAF.
// Penerima memakai /api/v1/me/certificates/:certId/download (Phase 7c); endpoint ini
// melayani platform admin & anggota org PENERBIT (dashboard org / panel admin),
// supaya PDF generated yang privat tetap bisa diunduh oleh pihak berwenang.

const db = require("../db");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const { sendCertificateFile } = require("../services/fileDelivery");

/**
 * GET /api/v1/certificates/:certId/download  (authenticateUser)
 * Diizinkan bila: platform admin, ATAU user adalah anggota org yang menerbitkan
 * sertifikat ini (cocokkan onchain_institution_id membership dgn cert.institution_id).
 */
const downloadCertificate = asyncHandler(async (req, res) => {
  const cert = await db.certificates.get(req.params.certId);
  if (!cert) throw new AppError("Sertifikat tidak ditemukan.", 404, "CERT_NOT_FOUND");
  if (!cert.file_cid) throw new AppError("Sertifikat ini tidak memiliki file.", 404, "NO_FILE");

  const u = req.authUser;
  const isMember = u.memberships?.some((m) => m.onchainInstitutionId === cert.institution_id);
  if (!u.isPlatformAdmin && !isMember) {
    throw new AppError("Anda tidak memiliki akses ke file sertifikat ini.", 403, "FORBIDDEN");
  }

  return sendCertificateFile(res, cert);
});

module.exports = { downloadCertificate };
