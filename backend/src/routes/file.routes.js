// src/routes/file.routes.js
const express = require("express");
const multer = require("multer");
const fileController = require("../controllers/file.controller");
const { authenticate, requireRole } = require("../middlewares/auth");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Unggah file ke IPFS (admin).
router.post("/files", authenticate, requireRole("admin"), upload.single("file"), fileController.uploadFile);

// Ambil file dari penyimpanan lokal (publik; dev gateway).
router.get("/files/:cid", fileController.getFile);

module.exports = router;
