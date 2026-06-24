// src/controllers/stats.controller.js
// Statistik dari read-model (DB) — TANPA menyentuh blockchain (cepat & scalable).

const db = require("../db");
const asyncHandler = require("../utils/asyncHandler");

/** GET /api/stats  (publik) -> ringkasan global + deret harian. */
const overview = asyncHandler(async (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 365);

  res.json({
    success: true,
    data: {
      totals: {
        certificates: db.certificates.countAll(),
        institutions: db.institutions.count(),
        verifications: db.verifications.countAll(),
      },
      issuedDaily: db.certificates.issuedDaily(days), // [{ day, count }]
      verifiedDaily: db.verifications.dailyCounts(days), // [{ day, count, valid_count }]
    },
  });
});

/** GET /api/institutions/:id/stats  (JWT admin) -> statistik per institusi. */
const institutionStats = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 365);

  res.json({
    success: true,
    data: {
      institutionId: id,
      totals: {
        certificates: db.certificates.countByInstitution(id),
      },
      verifiedDaily: db.verifications.dailyCounts(days, id),
    },
  });
});

module.exports = { overview, institutionStats };
