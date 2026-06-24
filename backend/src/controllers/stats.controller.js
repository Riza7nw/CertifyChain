// src/controllers/stats.controller.js
// Statistik dari read-model (DB) — TANPA menyentuh blockchain (cepat & scalable).

const db = require("../db");
const asyncHandler = require("../utils/asyncHandler");

/** GET /api/stats  (publik) -> ringkasan global + deret harian. */
const overview = asyncHandler(async (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 365);

  const [certificates, institutions, verifications, issuedDaily, verifiedDaily] = await Promise.all([
    db.certificates.countAll(),
    db.institutions.count(),
    db.verifications.countAll(),
    db.certificates.issuedDaily(days), // [{ day, count }]
    db.verifications.dailyCounts(days), // [{ day, count, valid_count }]
  ]);

  res.json({
    success: true,
    data: {
      totals: { certificates, institutions, verifications },
      issuedDaily,
      verifiedDaily,
    },
  });
});

/** GET /api/institutions/:id/stats  (JWT admin) -> statistik per institusi. */
const institutionStats = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 365);

  const [certificates, verifiedDaily] = await Promise.all([
    db.certificates.countByInstitution(id),
    db.verifications.dailyCounts(days, id),
  ]);

  res.json({
    success: true,
    data: {
      institutionId: id,
      totals: { certificates },
      verifiedDaily,
    },
  });
});

module.exports = { overview, institutionStats };
