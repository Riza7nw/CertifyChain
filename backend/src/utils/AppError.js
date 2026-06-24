// src/utils/AppError.js
// Error kustom dengan HTTP status code, dipakai agar error handler
// bisa mengembalikan response yang konsisten & tepat.

class AppError extends Error {
  /**
   * @param {string} message  Pesan untuk client.
   * @param {number} statusCode  HTTP status (default 500).
   * @param {string} [code]  Kode error opsional (mis. "CERT_NOT_FOUND").
   */
  constructor(message, statusCode = 500, code = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true; // error yang sudah kita antisipasi
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
