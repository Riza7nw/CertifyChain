// src/controllers/institution.controller.js
// Registrasi institusi (write/chain) + query dashboard (read/DB).

const { ethers } = require("ethers");
const blockchainService = require("../services/blockchain.service");
const storage = require("../storage");
const db = require("../db");
const audit = require("../services/audit.service");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");

/**
 * POST /api/institutions  (JWT platform admin)
 * Body: { adminAddress, name, metadataCid? }
 * Mendaftarkan institusi ke blockchain, lalu mencatat ke read-model.
 */
const registerInstitution = asyncHandler(async (req, res) => {
  const { adminAddress, name, metadataCid } = req.body || {};
  if (!name || typeof name !== "string") {
    throw new AppError("Field 'name' wajib diisi.", 400, "VALIDATION_ERROR");
  }
  if (!adminAddress || !ethers.isAddress(adminAddress)) {
    throw new AppError("'adminAddress' harus berupa alamat Ethereum yang valid.", 400, "VALIDATION_ERROR");
  }

  const result = await blockchainService.registerInstitution(adminAddress, name.trim(), metadataCid || "");

  await db.institutions.upsert({
    id: result.institutionId,
    name: name.trim(),
    metadataCid: metadataCid || null,
    adminAddress,
    active: true,
    txHash: result.txHash,
    blockNumber: result.blockNumber,
  });

  audit.record({ type: "INSTITUTION_REGISTERED", admin: req.user?.username, ip: req.ip, ...result, name: name.trim() });

  res.status(201).json({ success: true, message: "Institusi terdaftar.", data: { ...result, name: name.trim(), adminAddress } });
});

/** GET /api/institutions  (publik) -> daftar institusi dari read-model. */
const listInstitutions = asyncHandler(async (req, res) => {
  const list = await db.institutions.list();
  const items = await Promise.all(
    list.map(async (i) => ({
      id: i.id,
      name: i.name,
      metadataCid: i.metadata_cid,
      metadataUrl: i.metadata_cid ? storage.gatewayUrl(i.metadata_cid) : null,
      adminAddress: i.admin_address,
      active: !!i.active,
      certificateCount: await db.certificates.countByInstitution(i.id),
    }))
  );
  res.json({ success: true, data: items });
});

/** GET /api/institutions/:id  (publik) -> detail institusi. */
const getInstitution = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const inst = await db.institutions.get(id);
  if (!inst) throw new AppError("Institusi tidak ditemukan.", 404, "INSTITUTION_NOT_FOUND");

  res.json({
    success: true,
    data: {
      id: inst.id,
      name: inst.name,
      metadataCid: inst.metadata_cid,
      adminAddress: inst.admin_address,
      active: !!inst.active,
      certificateCount: await db.certificates.countByInstitution(inst.id),
    },
  });
});

/**
 * GET /api/institutions/:id/certificates?page=1&limit=20  (JWT admin)
 * Dashboard: daftar semua sertifikat institusi (dari read-model, paginasi).
 */
const listInstitutionCertificates = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) throw new AppError("institutionId tidak valid.", 400, "VALIDATION_ERROR");

  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const offset = (page - 1) * limit;

  const [total, rows] = await Promise.all([
    db.certificates.countByInstitution(id),
    db.certificates.listByInstitution(id, { limit, offset }),
  ]);

  res.json({
    success: true,
    data: {
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
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

module.exports = {
  registerInstitution,
  listInstitutions,
  getInstitution,
  listInstitutionCertificates,
};
