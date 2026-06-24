// src/routes/audit.routes.js
const express = require("express");
const { getAuditLog } = require("../controllers/audit.controller");
const { authenticate, requireRole } = require("../middlewares/auth");

const router = express.Router();

// Lihat audit log -> hanya admin terautentikasi
router.get("/audit", authenticate, requireRole("admin"), getAuditLog);

module.exports = router;
