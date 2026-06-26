// src/controllers/file.controller.js
// Unggah file ke IPFS + ambil file (untuk provider lokal saat dev).

const storage = require("../storage");
const db = require("../db");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const { isPrivateCert } = require("../utils/certPrivacy");

/**
 * POST /api/files  (multipart, JWT admin)
 * Unggah file -> IPFS, kembalikan CID. Berguna bila ingin pin file dulu,
 * terpisah dari proses penerbitan.
 */
const uploadFile = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError("File (field 'file') wajib diunggah.", 400, "VALIDATION_ERROR");
  const result = await storage.add(req.file.buffer, req.file.originalname);
  res.status(201).json({
    success: true,
    data: { cid: result.cid, size: result.size, url: storage.gatewayUrl(result.cid) },
  });
});

/**
 * GET /api/files/:cid  (publik)
 * Menyajikan file dari penyimpanan lokal (dev). Untuk provider IPFS/Pinata,
 * file diakses lewat gateway publik, bukan endpoint ini.
 *
 * Fase C3: file PRIVAT (PDF generated berisi PII) TIDAK boleh disajikan di sini.
 * Penerima mengunduh via /api/v1/me/certificates/:id/download; staf via
 * /api/v1/certificates/:id/download. File uploaded tetap publik (perilaku lama).
 */
const getFile = asyncHandler(async (req, res) => {
  const { cid } = req.params;
  if (typeof storage.getPath !== "function" || !storage.exists(cid)) {
    throw new AppError("File tidak tersedia di node ini.", 404, "FILE_NOT_FOUND");
  }
  const cert = db.certificates.findByFileCid ? await db.certificates.findByFileCid(cid) : null;
  if (isPrivateCert(cert)) {
    throw new AppError(
      "File ini privat. Masuk untuk mengunduh sertifikat lewat akun Anda.",
      403,
      "FILE_PRIVATE"
    );
  }
  res.sendFile(storage.getPath(cid));
});

module.exports = { uploadFile, getFile };
