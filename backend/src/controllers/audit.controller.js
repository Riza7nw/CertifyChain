// src/controllers/audit.controller.js
// Menampilkan audit log (khusus admin).

const asyncHandler = require("../utils/asyncHandler");
const audit = require("../services/audit.service");

/**
 * GET /api/audit?limit=50
 * Mengembalikan entri audit terbaru. Dilindungi JWT admin.
 */
const getAuditLog = asyncHandler(async (req, res) => {
  const requested = parseInt(req.query.limit, 10);
  const limit = Math.min(Number.isNaN(requested) ? 50 : requested, 500);
  res.json({ success: true, data: audit.getRecent(limit) });
});

module.exports = { getAuditLog };
