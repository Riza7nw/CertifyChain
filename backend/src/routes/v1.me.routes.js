// src/routes/v1.me.routes.js
// Phase 7c — self-service penerima. Semua endpoint butuh login + email terverifikasi.
const express = require("express");
const c = require("../controllers/v1.me.controller");
const { authenticateUser, requireVerifiedEmail } = require("../middlewares/userAuth");

const router = express.Router();

// Email wajib terverifikasi untuk mengakses sertifikat pribadi.
router.use("/me", authenticateUser, requireVerifiedEmail);

router.get("/me/certificates", c.listMyCertificates);
router.get("/me/certificates/:certId/download", c.downloadMyCertificate);
router.get("/me/certificates/:certId/status", c.myCertificateStatus);

module.exports = router;
