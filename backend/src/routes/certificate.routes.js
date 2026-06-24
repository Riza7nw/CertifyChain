// src/routes/certificate.routes.js
// Endpoint verifikasi & detail sertifikat (publik).
// Penerbitan kini per-institusi: lihat POST /institutions/:id/certificates.

const express = require("express");
const controller = require("../controllers/certificate.controller");

const router = express.Router();

// Verifikasi sertifikat berdasarkan ID (publik) -> juga mencatat statistik verifikasi.
router.get("/verify-certificate/:id", controller.verifyCertificate);

// Detail lengkap sertifikat (publik) -> gabungan on-chain + read-model.
router.get("/certificate/:id", controller.getCertificate);

// QR Code sertifikat (publik).
router.get("/certificate/:id/qrcode", controller.getCertificateQr);

module.exports = router;
