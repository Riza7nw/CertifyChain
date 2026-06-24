// src/middlewares/auth.js
// Middleware autentikasi & otorisasi berbasis JWT.

const jwt = require("jsonwebtoken");
const config = require("../config");
const AppError = require("../utils/AppError");

/**
 * Memverifikasi JWT pada header `Authorization: Bearer <token>`.
 * Jika valid, menempelkan { username, role } ke req.user.
 */
function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(
      new AppError("Akses ditolak. Sertakan header Authorization: Bearer <token>.", 401, "NO_TOKEN")
    );
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { username: payload.sub, role: payload.role };
    next();
  } catch (err) {
    const code = err.name === "TokenExpiredError" ? "TOKEN_EXPIRED" : "INVALID_TOKEN";
    next(new AppError("Token tidak valid atau sudah kedaluwarsa.", 401, code));
  }
}

/**
 * Membatasi akses ke role tertentu (mis. requireRole("admin")).
 * Harus dipakai SETELAH authenticate.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError("Anda tidak memiliki hak akses untuk aksi ini.", 403, "FORBIDDEN"));
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
