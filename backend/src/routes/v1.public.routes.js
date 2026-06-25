// src/routes/v1.public.routes.js
// Phase 7e — pencarian sertifikat publik (tanpa auth). Dibatasi laju (anti-enumerasi).
const express = require("express");
const c = require("../controllers/v1.public.controller");
const { searchLimiter } = require("../middlewares/rateLimit");

const router = express.Router();

router.get("/public/certificates", searchLimiter, c.searchCertificates);

module.exports = router;
