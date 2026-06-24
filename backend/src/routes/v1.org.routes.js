// src/routes/v1.org.routes.js
// Endpoint org-scoped (tenant isolation). Semua butuh access token (authenticateUser).
const express = require("express");
const multer = require("multer");
const c = require("../controllers/v1.org.controller");
const { authenticateUser, requireOrgRole, requirePlatformAdmin } = require("../middlewares/userAuth");
const { issueLimiter } = require("../middlewares/rateLimit");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const ANY_MEMBER = ["OrgAdmin", "Issuer", "Viewer"];
const CAN_ISSUE = ["OrgAdmin", "Issuer"];

// Daftar org milik user (platform admin: semua)
router.get("/orgs", authenticateUser, c.listMyOrgs);

// Dashboard & statistik — hanya anggota org (platform admin bypass via requireOrgRole)
router.get("/orgs/:orgId/certificates", authenticateUser, requireOrgRole(ANY_MEMBER), c.getOrgCertificates);
router.get("/orgs/:orgId/stats", authenticateUser, requireOrgRole(ANY_MEMBER), c.getOrgStats);

// Provision institusi on-chain — platform admin only
router.post("/orgs/:orgId/provision", authenticateUser, requirePlatformAdmin, c.provisionOrg);

// Terbitkan sertifikat (OrgAdmin/Issuer) — multipart + file
router.post(
  "/orgs/:orgId/certificates",
  issueLimiter,
  authenticateUser,
  requireOrgRole(CAN_ISSUE),
  upload.single("file"),
  c.issueOrgCertificate
);

module.exports = router;
