// src/controllers/v1.org.controller.js
// Endpoint org-scoped (multi-tenant). Setiap query DIBATASI ke organisasi user
// (via requireOrgRole di route). Org -> institusi on-chain via onchain_institution_id.

const prisma = require("../db/prismaClient");
const db = require("../db");
const storage = require("../storage");
const config = require("../config");
const blockchainService = require("../services/blockchain.service");
const certificateService = require("../services/certificate.service");
const templateService = require("../services/template.service");
const renderQueue = require("../services/renderQueue.service");
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

/**
 * POST /api/v1/orgs/:orgId/provision  (platform admin)
 * Daftarkan institusi org ke blockchain (admin on-chain = wallet backend agar bisa
 * menerbitkan), lalu tautkan onchain_institution_id. Transaksi on-chain (butuh gas).
 */
const provisionOrg = asyncHandler(async (req, res) => {
  const orgId = Number(req.params.orgId);
  const org = await loadOrg(orgId);
  if (org.onchain_institution_id != null) {
    throw new AppError("Organisasi sudah diprovision on-chain.", 409, "ALREADY_PROVISIONED");
  }

  const { metadataCid } = req.body || {};
  // admin institusi = wallet backend (signer custodial) -> backend bisa menerbitkan.
  const result = await blockchainService.registerInstitution(
    blockchainService.walletAddress,
    org.name,
    metadataCid || ""
  );

  await prisma.organizations.update({
    where: { id: orgId },
    data: { onchain_institution_id: result.institutionId },
  });
  // Tampilkan langsung di read-model (indexer juga akan merekonsiliasi dari event).
  await db.institutions.upsert({
    id: result.institutionId,
    name: org.name,
    metadataCid: metadataCid || null,
    adminAddress: blockchainService.walletAddress,
    active: true,
    txHash: result.txHash,
    blockNumber: result.blockNumber,
  });

  res.status(201).json({
    success: true,
    message: "Organisasi terprovision on-chain.",
    data: { orgId, onchainInstitutionId: result.institutionId, txHash: result.txHash },
  });
});

/**
 * POST /api/v1/orgs/:orgId/certificates  (OrgAdmin/Issuer, multipart + file)
 * Terbitkan sertifikat atas nama institusi org (tenant-scoped).
 */
const issueOrgCertificate = asyncHandler(async (req, res) => {
  const orgId = Number(req.params.orgId);
  const org = await loadOrg(orgId);

  const { recipientName, recipientEmail, data } = req.body || {};
  if (!recipientName || typeof recipientName !== "string") {
    throw new AppError("Field 'recipientName' wajib diisi.", 400, "VALIDATION_ERROR");
  }
  if (!req.file) {
    throw new AppError("File sertifikat (field 'file') wajib diunggah.", 400, "VALIDATION_ERROR");
  }
  if (org.onchain_institution_id == null) {
    throw new AppError("Organisasi belum diprovision on-chain.", 409, "NOT_PROVISIONED");
  }

  const result = await certificateService.issueToInstitution({
    institutionId: org.onchain_institution_id,
    recipientName,
    recipientEmail,
    data,
    fileBuffer: req.file.buffer,
    fileName: req.file.originalname,
    mimeType: req.file.mimetype,
    issuedByLabel: req.authUser.email,
    ip: req.ip,
  });

  res.status(201).json({ success: true, message: "Sertifikat berhasil diterbitkan.", data: result });
});

/**
 * POST /api/v1/orgs/:orgId/certificates/generate  (OrgAdmin/Issuer, JSON — TANPA file)
 * Platform MERENDER PDF dari template lalu menerbitkan (Fase A).
 */
const generateOrgCertificate = asyncHandler(async (req, res) => {
  const orgId = Number(req.params.orgId);
  const org = await loadOrg(orgId);

  const { recipientName, recipientEmail, data, template, templateKey } = req.body || {};
  if (!recipientName || typeof recipientName !== "string") {
    throw new AppError("Field 'recipientName' wajib diisi.", 400, "VALIDATION_ERROR");
  }
  if (org.onchain_institution_id == null) {
    throw new AppError("Organisasi belum diprovision on-chain.", 409, "NOT_PROVISIONED");
  }

  const common = {
    institutionId: org.onchain_institution_id,
    institutionName: org.name,
    recipientName,
    recipientEmail,
    data,
    template: template || templateKey, // ref: 'classic'|'modern'|'<id>'
    issuedByLabel: req.authUser.email,
    ip: req.ip,
  };

  // Mode ASYNC (Fase C-scale): enqueue job, balas 202 cepat; worker memproses di latar.
  // Hanya bila diaktifkan & memakai Postgres (antrian Postgres-only).
  if (config.pdfAsync.enabled && config.dbDriver === "postgres") {
    const job = await renderQueue.enqueueGenerate({ ...common, organizationId: orgId });
    return res.status(202).json({
      success: true,
      message: "Sertifikat PDF sedang diproses.",
      data: { async: true, jobId: job.jobId, certificateId: job.certificateId, status: job.status },
    });
  }

  // Mode SINKRON (default): render + issue langsung.
  const result = await certificateService.issueGenerated({ ...common, orgId });
  res.status(201).json({ success: true, message: "Sertifikat PDF berhasil diterbitkan.", data: result });
});

/** GET /api/v1/certificate-templates — base templates global (kompat lama). */
const listTemplates = asyncHandler(async (req, res) => {
  res.json({ success: true, data: certificateService.listTemplates() });
});

/** GET /api/v1/orgs/:orgId/templates — base + global + template milik org. */
const listOrgTemplates = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await templateService.listForOrg(Number(req.params.orgId)) });
});

/** POST /api/v1/orgs/:orgId/templates (OrgAdmin) — buat template ber-branding. */
const createOrgTemplate = asyncHandler(async (req, res) => {
  const orgId = Number(req.params.orgId);
  const { name, key, accent } = req.body || {};
  if (!name || typeof name !== "string") throw new AppError("Field 'name' wajib diisi.", 400, "VALIDATION_ERROR");
  if (accent && !/^#[0-9a-fA-F]{6}$/.test(accent)) throw new AppError("Warna aksen harus hex #RRGGBB.", 400, "VALIDATION_ERROR");
  const tpl = await templateService.create(orgId, { name, key, accent });
  res.status(201).json({ success: true, message: "Template dibuat.", data: tpl });
});

/** DELETE /api/v1/orgs/:orgId/templates/:id (OrgAdmin). */
const deleteOrgTemplate = asyncHandler(async (req, res) => {
  const ok = await templateService.remove(Number(req.params.orgId), req.params.id);
  if (!ok) throw new AppError("Template tidak ditemukan.", 404, "TEMPLATE_NOT_FOUND");
  res.json({ success: true, message: "Template dihapus." });
});

module.exports = { listMyOrgs, getOrgCertificates, getOrgStats, provisionOrg, issueOrgCertificate, generateOrgCertificate, listTemplates, listOrgTemplates, createOrgTemplate, deleteOrgTemplate };
