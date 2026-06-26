// src/controllers/v1.public.controller.js
// Phase 7e — pencarian sertifikat PUBLIK (tanpa login). Sesuai keputusan privasi:
// pencarian HANYA boleh by certId (exact) dan/atau NAMA INSTITUSI — TIDAK boleh
// by nama/email penerima, dan hasil TIDAK membocorkan PII penerima (recipientName/
// recipientEmail). Konfirmasi keaslian on-chain tetap lewat /api/verify-certificate/:id.

const db = require("../db");
const storage = require("../storage");
const config = require("../config");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const { isValidBytes32 } = require("../utils/hash");
const { isPrivateCert } = require("../utils/certPrivacy");

/**
 * GET /api/v1/public/certificates?certId=&institution=&page=&limit=
 * Minimal salah satu dari certId / institution wajib diisi.
 */
const searchCertificates = asyncHandler(async (req, res) => {
  const certIdRaw = (req.query.certId || "").trim();
  const instQuery = (req.query.institution || "").trim();

  if (!certIdRaw && !instQuery) {
    throw new AppError("Sertakan minimal 'certId' atau 'institution'.", 400, "VALIDATION_ERROR");
  }
  if (certIdRaw && !isValidBytes32(certIdRaw)) {
    throw new AppError("Format certId tidak valid (harus bytes32 hex 0x...).", 400, "INVALID_ID");
  }
  if (instQuery && instQuery.length < 2) {
    throw new AppError("Nama institusi minimal 2 karakter.", 400, "VALIDATION_ERROR");
  }

  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
  const offset = (page - 1) * limit;

  // Peta institusi (id -> nama) sekaligus dasar filter nama (jumlah institusi kecil).
  const institutions = await db.institutions.list();
  const nameById = new Map(institutions.map((i) => [i.id, i.name]));

  // Filter institusi by nama (substring, case-insensitive) -> daftar id.
  let institutionIds = null;
  if (instQuery) {
    const q = instQuery.toLowerCase();
    institutionIds = institutions.filter((i) => (i.name || "").toLowerCase().includes(q)).map((i) => i.id);
  }

  const [total, rows] = await Promise.all([
    db.certificates.countPublic({ certId: certIdRaw || null, institutionIds }),
    db.certificates.searchPublic({ certId: certIdRaw || null, institutionIds, limit, offset }),
  ]);

  res.json({
    success: true,
    data: {
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      // Field PUBLIK saja — sengaja TANPA recipientName / recipientEmail.
      items: rows.map((r) => ({
        certificateId: r.certificate_id,
        institutionId: r.institution_id,
        institutionName: nameById.get(r.institution_id) ?? null,
        status: r.status,
        issuedAt: r.issued_at,
        // Fase C3: PDF generated berisi PII -> JANGAN bocorkan fileUrl publik
        // (pencarian publik memang menyembunyikan PII penerima).
        fileUrl: !isPrivateCert(r) && r.file_cid ? storage.gatewayUrl(r.file_cid) : null,
        // Verifikasi keaslian (on-chain) dilakukan lewat endpoint ini.
        verifyUrl: `${config.publicBaseUrl}/verify/${r.certificate_id}`,
      })),
    },
  });
});

module.exports = { searchCertificates };
