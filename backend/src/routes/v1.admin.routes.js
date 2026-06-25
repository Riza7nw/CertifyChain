// src/routes/v1.admin.routes.js
// Phase 7d — panel admin platform. Semua endpoint butuh login + role global 'admin'.
const express = require("express");
const c = require("../controllers/v1.admin.controller");
const { authenticateUser, requireRole } = require("../middlewares/userAuth");

const router = express.Router();

// Gerbang: harus login & role 'admin' untuk SEMUA endpoint /admin.
router.use("/admin", authenticateUser, requireRole("admin"));

router.get("/admin/users", c.listUsers);
router.patch("/admin/users/:userId", c.updateUser);
router.delete("/admin/users/:userId", c.deleteUser);
router.get("/admin/certificates", c.listAllCertificates);

module.exports = router;
