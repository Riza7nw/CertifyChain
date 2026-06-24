// src/routes/v1.org.routes.js
// Endpoint org-scoped (tenant isolation). Semua butuh access token (authenticateUser).
const express = require("express");
const c = require("../controllers/v1.org.controller");
const { authenticateUser, requireOrgRole } = require("../middlewares/userAuth");

const router = express.Router();

const ANY_MEMBER = ["OrgAdmin", "Issuer", "Viewer"];

// Daftar org milik user (platform admin: semua)
router.get("/orgs", authenticateUser, c.listMyOrgs);

// Dashboard & statistik — hanya anggota org (platform admin bypass via requireOrgRole)
router.get("/orgs/:orgId/certificates", authenticateUser, requireOrgRole(ANY_MEMBER), c.getOrgCertificates);
router.get("/orgs/:orgId/stats", authenticateUser, requireOrgRole(ANY_MEMBER), c.getOrgStats);

module.exports = router;
