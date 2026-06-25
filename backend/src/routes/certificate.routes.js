// src/routes/certificate.routes.js
// Endpoint verifikasi & detail sertifikat (publik).
// Penerbitan kini per-institusi: lihat POST /institutions/:id/certificates.

const express = require("express");
const multer = require("multer");
const controller = require("../controllers/certificate.controller");
const { searchLimiter } = require("../middlewares/rateLimit");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

// Verifikasi sertifikat berdasarkan ID (publik) -> juga mencatat statistik verifikasi.
router.get("/verify-certificate/:id", controller.verifyCertificate);

// Verifikasi anti-tamper dengan unggah PDF (publik, Fase B).
router.post("/verify-pdf", searchLimiter, upload.single("file"), controller.verifyPdf);

// Detail lengkap sertifikat (publik) -> gabungan on-chain + read-model.
router.get("/certificate/:id", controller.getCertificate);

// QR Code sertifikat (publik).
router.get("/certificate/:id/qrcode", controller.getCertificateQr);

module.exports = router;
