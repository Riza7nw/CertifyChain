// src/app.js
// Konfigurasi aplikasi Express (middleware, routes, error handler).
// Dipisah dari server.js agar mudah di-test.

const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");

const certificateRoutes = require("./routes/certificate.routes");
const authRoutes = require("./routes/auth.routes");
const auditRoutes = require("./routes/audit.routes");
const institutionRoutes = require("./routes/institution.routes");
const statsRoutes = require("./routes/stats.routes");
const fileRoutes = require("./routes/file.routes");
const blockchainService = require("./services/blockchain.service");
const asyncHandler = require("./utils/asyncHandler");
const { notFoundHandler, errorHandler } = require("./middlewares/errorHandler");

const app = express();

// Di belakang reverse proxy (nginx/cloud), agar req.ip & rate limit akurat.
app.set("trust proxy", 1);

// --- Middleware global ---
app.use(helmet());                        // security headers (XSS, sniffing, dll.)
app.use(cors());                          // izinkan akses dari frontend
app.use(express.json({ limit: "100kb" })); // parse body JSON + batasi ukuran
app.use(morgan("dev"));                   // logging request

// --- Healthcheck / status koneksi blockchain ---
app.get(
  "/health",
  asyncHandler(async (req, res) => {
    const status = await blockchainService.getStatus();
    res.json({ success: true, status: "ok", blockchain: status });
  })
);

// --- Routes ---
app.use("/api/auth", authRoutes);         // login admin (publik)
app.use("/api", institutionRoutes);       // institusi + dashboard + penerbitan (multi-institusi)
app.use("/api", certificateRoutes);       // verify/get/qr (publik)
app.use("/api", statsRoutes);             // statistik (publik)
app.use("/api", fileRoutes);              // upload/serve file IPFS
app.use("/api", auditRoutes);             // audit log (admin)

// --- 404 & error handler (HARUS di paling bawah) ---
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
