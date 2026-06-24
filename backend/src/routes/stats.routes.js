// src/routes/stats.routes.js
const express = require("express");
const statsController = require("../controllers/stats.controller");

const router = express.Router();

// Statistik global (publik): jumlah sertifikat, institusi, verifikasi harian.
router.get("/stats", statsController.overview);

module.exports = router;
