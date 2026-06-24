// src/routes/institution.routes.js
const express = require("express");
const multer = require("multer");
const institutionController = require("../controllers/institution.controller");
const certificateController = require("../controllers/certificate.controller");
const statsController = require("../controllers/stats.controller");
const { authenticate, requireRole } = require("../middlewares/auth");
const { issueLimiter } = require("../middlewares/rateLimit");

const router = express.Router();

// Upload file di memori, batasi 10MB (file sertifikat PDF/gambar).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// --- Registrasi & daftar institusi ---
router.post("/institutions", authenticate, requireRole("admin"), institutionController.registerInstitution);
router.get("/institutions", institutionController.listInstitutions); // publik
router.get("/institutions/:id", institutionController.getInstitution); // publik

// --- Dashboard institusi (admin) ---
router.get(
  "/institutions/:id/certificates",
  authenticate,
  requireRole("admin"),
  institutionController.listInstitutionCertificates
);
router.get(
  "/institutions/:id/stats",
  authenticate,
  requireRole("admin"),
  statsController.institutionStats
);

// --- Penerbitan sertifikat untuk institusi (admin, multipart + file) ---
router.post(
  "/institutions/:id/certificates",
  issueLimiter,
  authenticate,
  requireRole("admin"),
  upload.single("file"),
  certificateController.issueCertificate
);

module.exports = router;
