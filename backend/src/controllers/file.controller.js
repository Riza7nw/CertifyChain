// src/controllers/file.controller.js
// Unggah file ke IPFS + ambil file (untuk provider lokal saat dev).

const storage = require("../storage");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");

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
 */
const getFile = asyncHandler(async (req, res) => {
  const { cid } = req.params;
  if (typeof storage.getPath !== "function" || !storage.exists(cid)) {
    throw new AppError("File tidak tersedia di node ini.", 404, "FILE_NOT_FOUND");
  }
  res.sendFile(storage.getPath(cid));
});

module.exports = { uploadFile, getFile };
