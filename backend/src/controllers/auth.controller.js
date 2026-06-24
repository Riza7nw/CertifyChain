// src/controllers/auth.controller.js
// Login admin -> mengeluarkan JWT.

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const config = require("../config");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const audit = require("../services/audit.service");

/**
 * POST /api/auth/login
 * Body: { username, password }
 * Mengembalikan JWT bila kredensial benar.
 */
const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    throw new AppError("username dan password wajib diisi.", 400, "VALIDATION_ERROR");
  }

  const usernameOk = username === config.adminUsername;
  // Selalu jalankan bcrypt.compare (walau username salah) untuk meredam
  // timing attack / user enumeration. Password disimpan sebagai hash, bukan plaintext.
  const passwordOk = await bcrypt.compare(password, config.adminPasswordHash);

  if (!usernameOk || !passwordOk) {
    audit.record({ type: "LOGIN_FAILED", username, ip: req.ip });
    throw new AppError("Username atau password salah.", 401, "INVALID_CREDENTIALS");
  }

  const token = jwt.sign({ role: "admin" }, config.jwtSecret, {
    subject: username,
    expiresIn: config.jwtExpiresIn,
  });

  audit.record({ type: "LOGIN_SUCCESS", username, ip: req.ip });

  res.json({
    success: true,
    data: { token, tokenType: "Bearer", expiresIn: config.jwtExpiresIn },
  });
});

module.exports = { login };
