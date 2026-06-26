// src/controllers/certificate.controller.js
// Menangani request/response HTTP sertifikat (alur multi-institusi + IPFS).

const blockchainService = require("../services/blockchain.service");
const qrService = require("../services/qr.service");
const certificateService = require("../services/certificate.service");
const pdfVerifyService = require("../services/pdfVerify.service");
const storage = require("../storage");
const db = require("../db");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const { isValidBytes32 } = require("../utils/hash");
const { isPrivateCert } = require("../utils/certPrivacy");

/**
 * POST /api/institutions/:id/certificates   (multipart/form-data, JWT admin)
 * Field: file (PDF/gambar), recipientName, data (opsional, metadata tambahan)
 *
 * Alur write-path scalable:
 *   1. unggah file -> IPFS (dapat fileCid)
 *   2. susun metadata kanonik -> dataHash (keccak256) sebagai bukti integritas
 *   3. catat ke blockchain (institutionId, certificateId, dataHash, fileCid)
 *   4. tulis ke read-model (DB) untuk dashboard; indexer akan rekonsiliasi dari event
 */
const issueCertificate = asyncHandler(async (req, res) => {
  const institutionId = parseInt(req.params.id, 10);
  if (Number.isNaN(institutionId) || institutionId <= 0) {
    throw new AppError("institutionId tidak valid.", 400, "VALIDATION_ERROR");
  }

  const { recipientName, recipientEmail, data } = req.body || {};
  if (!recipientName || typeof recipientName !== "string") {
    throw new AppError("Field 'recipientName' wajib diisi.", 400, "VALIDATION_ERROR");
  }
  if (!req.file) {
    throw new AppError("File sertifikat (field 'file') wajib diunggah.", 400, "VALIDATION_ERROR");
  }

  // Logika inti dipindah ke certificate.service (dipakai juga endpoint v1).
  const result = await certificateService.issueToInstitution({
    institutionId,
    recipientName,
    recipientEmail,
    data,
    fileBuffer: req.file.buffer,
    fileName: req.file.originalname,
    mimeType: req.file.mimetype,
    issuedByLabel: req.user?.username,
    ip: req.ip,
  });

  res.status(201).json({
    success: true,
    message: "Sertifikat berhasil diterbitkan.",
    data: result,
  });
});

/** GET /api/certificate/:id/qrcode -> PNG (atau ?format=dataurl). */
const getCertificateQr = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidBytes32(id)) {
    throw new AppError("Format certificateId tidak valid (harus bytes32 hex).", 400, "INVALID_ID");
  }
  const verificationUrl = qrService.buildVerificationUrl(id);

  if (req.query.format === "dataurl") {
    const qrCode = await qrService.generateQrDataUrl(verificationUrl);
    return res.status(200).json({ success: true, data: { certificateId: id, verificationUrl, qrCode } });
  }
  const buffer = await qrService.generateQrBuffer(verificationUrl);
  res.setHeader("Content-Type", "image/png");
  res.setHeader("Cache-Control", "public, max-age=3600");
  return res.status(200).send(buffer);
});

/**
 * GET /api/verify-certificate/:id  (publik)
 * Verifikasi ke blockchain (sumber kebenaran) + CATAT untuk statistik harian.
 */
const verifyCertificate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidBytes32(id)) {
    throw new AppError("Format certificateId tidak valid (harus bytes32 hex).", 400, "INVALID_ID");
  }

  const valid = await blockchainService.verifyCertificate(id);

  // Catat event verifikasi (untuk statistik). institutionId diambil dari read-model.
  const row = await db.certificates.get(id);
  await db.verifications.record({
    certificateId: id,
    institutionId: row?.institution_id ?? null,
    valid,
    ip: req.ip,
  });

  res.status(200).json({
    success: true,
    data: {
      certificateId: id,
      valid,
      message: valid
        ? "Sertifikat ASLI dan masih aktif."
        : "Sertifikat tidak ditemukan atau sudah dicabut/tidak valid.",
    },
  });
});

/**
 * GET /api/certificate/:id  (publik)
 * Gabungkan data on-chain (sumber kebenaran) + read-model (PII recipientName, dsb).
 */
const getCertificate = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!isValidBytes32(id)) {
    throw new AppError("Format certificateId tidak valid (harus bytes32 hex).", 400, "INVALID_ID");
  }

  const onchain = await blockchainService.getCertificate(id);
  const row = await db.certificates.get(id);
  const institution = row ? await db.institutions.get(row.institution_id) : null;

  // Fase C3: file generated bersifat privat -> jangan bocorkan fileUrl publik.
  const privateFile = isPrivateCert(row);

  res.status(200).json({
    success: true,
    data: {
      ...onchain,
      recipientName: row?.recipient_name ?? null, // PII dari off-chain
      fileUrl: !privateFile && onchain.fileCid ? storage.gatewayUrl(onchain.fileCid) : null,
      fileAccess: privateFile ? "private" : "public",
      institutionName: institution?.name ?? null,
    },
  });
});

/**
 * POST /api/verify-pdf  (publik, multipart 'file')
 * Anti-tampering: hitung ulang CID/keccak byte PDF, cocokkan ke catatan + on-chain.
 */
const verifyPdf = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError("File PDF (field 'file') wajib diunggah.", 400, "VALIDATION_ERROR");
  }
  const result = await pdfVerifyService.verifyPdf(req.file.buffer);
  res.status(200).json({ success: true, data: result });
});

module.exports = { issueCertificate, verifyCertificate, getCertificate, getCertificateQr, verifyPdf };
