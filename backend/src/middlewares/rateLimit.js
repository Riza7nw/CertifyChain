// src/middlewares/rateLimit.js
// Pembatasan laju permintaan untuk mengurangi brute-force & abuse.

const rateLimit = require("express-rate-limit");

const jsonMessage = (message) => ({
  success: false,
  error: { code: "RATE_LIMITED", message },
});

// Login: ketat, untuk mencegah brute-force password.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 10, // maksimum 10 percobaan / IP / window
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage("Terlalu banyak percobaan login. Coba lagi dalam beberapa menit."),
});

// Penerbitan: batasi agar tidak ada spam transaksi (yang juga membakar gas).
const issueLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 menit
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage("Terlalu banyak permintaan penerbitan. Coba lagi sebentar lagi."),
});

module.exports = { loginLimiter, issueLimiter };
