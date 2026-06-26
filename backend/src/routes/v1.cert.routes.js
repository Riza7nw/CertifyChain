// src/routes/v1.cert.routes.js
// Fase C3 — unduhan sertifikat akses-terkontrol untuk staf (admin / anggota org).
const express = require("express");
const c = require("../controllers/v1.cert.controller");
const { authenticateUser } = require("../middlewares/userAuth");

const router = express.Router();

router.get("/certificates/:certId/download", authenticateUser, c.downloadCertificate);

module.exports = router;
