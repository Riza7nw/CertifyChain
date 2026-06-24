// src/controllers/v1.org.controller.js
// Endpoint org-scoped (multi-tenant). Setiap query DIBATASI ke organisasi user
// (via requireOrgRole di route). Org -> institusi on-chain via onchain_institution_id.

const prisma = require("../db/prismaClient");
const db = require("../db");
const storage = require("../storage");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");

/** GET /api/v1/orgs — daftar org milik user (platform admin: semua org). */
const listMyOrgs = asyncHandler(async (req, res) => {
  const isPA = req.authUser.isPlatformAdmin;
  const orgs = isPA
    ? await prisma.organizations.findMany({ orderBy: { id: "asc" } })
    : await prisma.organizations.findMany({
        where: { id: { in: req.authUser.memberships.map((m) => m.orgId) } },
        orderBy: { id: "asc" },
      });

  const roleByOrg = Object.fromEntries(req.authUser.memberships.map((m) => [m.orgId, m.role]));

  const data = await Promise.all(
    orgs.map(async (o) => ({
      id: o.id,
      name: o.name,
      slug: o.slug,
      onchainInstitutionId: o.onchain_institution_id,
      role: roleByOrg[o.id] || (isPA ? "PlatformAdmin" : null),
      provisioned: o.onchain_institution_id != null,
      certificateCount:
        o.onchain_institution_id != null
          ? await db.certificates.countByInstitution(o.onchain_institution_id)
          : 0,
    }))
  );

  res.json({ success: true, data });
});

// Ambil org by id atau 404. (Akses sudah dijamin requireOrgRole sebelum controller.)
async function loadOrg(orgId) {
  const org = await prisma.organizations.findUnique({ where: { id: orgId } });
  if (!org) throw new AppError("Organisasi tidak ditemukan.", 404, "ORG_NOT_FOUND");
  return org;
}

/** GET /api/v1/orgs/:orgId/certificates — dashboard sertifikat org (paginasi). */
const getOrgCertificates = asyncHandler(async (req, res) => {
  const orgId = Number(req.params.orgId);
  const org = await loadOrg(orgId);

  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const offset = (page - 1) * limit;
  const institutionId = org.onchain_institution_id;

  // Org belum diprovision on-chain -> belum ada sertifikat.
  if (institutionId == null) {
    return res.json({
      success: true,
      data: { pagination: { page, limit, total: 0, totalPages: 0 }, items: [], provisioned: false },
    });
  }

  const [total, rows] = await Promise.all([
    db.certificates.countByInstitution(institutionId),
    db.certificates.listByInstitution(institutionId, { limit, offset }),
  ]);

  res.json({
    success: true,
    data: {
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      provisioned: true,
      items: rows.map((r) => ({
        certificateId: r.certificate_id,
        recipientName: r.recipient_name,
        fileCid: r.file_cid,
        fileUrl: r.file_cid ? storage.gatewayUrl(r.file_cid) : null,
        status: r.status,
        issuedAt: r.issued_at,
        txHash: r.tx_hash,
        issuedBy: r.issued_by,
      })),
    },
  });
});

/** GET /api/v1/orgs/:orgId/stats — statistik org. */
const getOrgStats = asyncHandler(async (req, res) => {
  const orgId = Number(req.params.orgId);
  const org = await loadOrg(orgId);
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 365);
  const institutionId = org.onchain_institution_id;

  const [certificates, verifiedDaily] = await Promise.all([
    institutionId != null ? db.certificates.countByInstitution(institutionId) : 0,
    institutionId != null ? db.verifications.dailyCounts(days, institutionId) : [],
  ]);

  res.json({
    success: true,
    data: { orgId, onchainInstitutionId: institutionId, totals: { certificates }, verifiedDaily },
  });
});

module.exports = { listMyOrgs, getOrgCertificates, getOrgStats };
