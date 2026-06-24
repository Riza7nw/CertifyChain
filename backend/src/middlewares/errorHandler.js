// src/middlewares/errorHandler.js
// Middleware terpusat untuk menangani semua error & 404.

const AppError = require("../utils/AppError");

/**
 * Handler untuk route yang tidak ditemukan (404).
 */
function notFoundHandler(req, res, next) {
  next(new AppError(`Endpoint tidak ditemukan: ${req.method} ${req.originalUrl}`, 404, "NOT_FOUND"));
}

/**
 * Error handler global. HARUS punya 4 argumen agar Express mengenalinya.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const code = err.code || "INTERNAL_ERROR";

  // Log detail di server (jangan bocorkan stack ke client di produksi)
  if (statusCode >= 500) {
    console.error("[ERROR]", err);
  } else {
    console.warn(`[WARN] ${code}: ${err.message}`);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message: err.message || "Terjadi kesalahan internal.",
    },
  });
}

module.exports = { notFoundHandler, errorHandler };
