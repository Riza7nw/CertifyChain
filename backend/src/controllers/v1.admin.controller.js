// src/controllers/v1.admin.controller.js
// Phase 7d — panel admin platform (role global 'admin'). Kelola user + lihat
// SEMUA sertifikat lintas institusi. Identity store (users/memberships) =
// Postgres-only, jadi controller ini memakai prisma langsung (selaras v1.org/v1.me).

const prisma = require("../db/prismaClient");
const db = require("../db");
const storage = require("../storage");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const { isPrivateCert } = require("../utils/certPrivacy");

const VALID_ROLES = ["admin", "user"];

// Bentuk user untuk respons admin (tanpa membocorkan password_hash).
function toUser(u) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    active: u.active,
    emailVerified: !!u.email_verified_at,
    createdAt: u.created_at,
    memberships: (u.memberships || []).map((m) => ({
      orgId: m.organization_id,
      orgName: m.organization?.name,
      orgSlug: m.organization?.slug,
      role: m.role,
    })),
  };
}

/** GET /api/v1/admin/users — daftar semua user (paginasi + filter q/role/active). */
const listUsers = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const offset = (page - 1) * limit;

  const where = {};
  const q = (req.query.q || "").trim();
  if (q) where.email = { contains: q, mode: "insensitive" };
  if (req.query.role && VALID_ROLES.includes(req.query.role)) where.role = req.query.role;
  if (req.query.active === "true") where.active = true;
  if (req.query.active === "false") where.active = false;

  const [total, rows] = await Promise.all([
    prisma.users.count({ where }),
    prisma.users.findMany({
      where,
      orderBy: { id: "asc" },
      take: limit,
      skip: offset,
      include: { memberships: { include: { organization: true } } },
    }),
  ]);

  res.json({
    success: true,
    data: {
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      items: rows.map(toUser),
    },
  });
});

/** PATCH /api/v1/admin/users/:userId — ubah role / status aktif user. */
const updateUser = asyncHandler(async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId)) throw new AppError("userId tidak valid.", 400, "VALIDATION_ERROR");

  const target = await prisma.users.findUnique({ where: { id: userId } });
  if (!target) throw new AppError("User tidak ditemukan.", 404, "USER_NOT_FOUND");

  const { role, active } = req.body || {};
  const data = {};
  if (role !== undefined) {
    if (!VALID_ROLES.includes(role)) throw new AppError("role harus 'admin' atau 'user'.", 400, "VALIDATION_ERROR");
    data.role = role;
    data.is_platform_admin = role === "admin"; // jaga sinkron dgn flag transisi
  }
  if (active !== undefined) {
    if (typeof active !== "boolean") throw new AppError("active harus boolean.", 400, "VALIDATION_ERROR");
    data.active = active;
  }
  if (Object.keys(data).length === 0) {
    throw new AppError("Tidak ada perubahan (kirim role dan/atau active).", 400, "VALIDATION_ERROR");
  }

  // Cegah admin mengunci dirinya sendiri (turunkan/nonaktifkan akun sendiri).
  if (userId === req.authUser.id && (data.role === "user" || data.active === false)) {
    throw new AppError("Tidak dapat menurunkan/menonaktifkan akun Anda sendiri.", 400, "SELF_LOCKOUT");
  }

  const updated = await prisma.users.update({
    where: { id: userId },
    data,
    include: { memberships: { include: { organization: true } } },
  });

  // Bila user dinonaktifkan / diturunkan -> cabut semua refresh token (paksa logout).
  if (data.active === false || data.role === "user") {
    await prisma.refresh_tokens.updateMany({
      where: { user_id: userId, revoked: false },
      data: { revoked: true },
    });
  }

  res.json({ success: true, message: "User diperbarui.", data: toUser(updated) });
});

/** DELETE /api/v1/admin/users/:userId — hapus user (cascade memberships/token). */
const deleteUser = asyncHandler(async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isInteger(userId)) throw new AppError("userId tidak valid.", 400, "VALIDATION_ERROR");
  if (userId === req.authUser.id) {
    throw new AppError("Tidak dapat menghapus akun Anda sendiri.", 400, "SELF_DELETE");
  }

  const target = await prisma.users.findUnique({ where: { id: userId } });
  if (!target) throw new AppError("User tidak ditemukan.", 404, "USER_NOT_FOUND");

  // memberships / refresh_tokens / email_tokens cascade (onDelete: Cascade di schema).
  await prisma.users.delete({ where: { id: userId } });
  res.json({ success: true, message: "User dihapus." });
});

/** GET /api/v1/admin/certificates — SEMUA sertifikat lintas institusi (paginasi). */
const listAllCertificates = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const offset = (page - 1) * limit;

  const [total, rows] = await Promise.all([
    db.certificates.countAll(),
    db.certificates.listAll({ limit, offset }),
  ]);

  res.json({
    success: true,
    data: {
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      items: rows.map((r) => ({
        certificateId: r.certificate_id,
        institutionId: r.institution_id,
        recipientName: r.recipient_name,
        recipientEmail: r.recipient_email,
        fileCid: r.file_cid,
        // Fase C3: file generated privat -> tanpa fileUrl publik (unduh via /download).
        fileUrl: !isPrivateCert(r) && r.file_cid ? storage.gatewayUrl(r.file_cid) : null,
        fileAccess: isPrivateCert(r) ? "private" : "public",
        status: r.status,
        issuedAt: r.issued_at,
        txHash: r.tx_hash,
        issuedBy: r.issued_by,
      })),
    },
  });
});

module.exports = { listUsers, updateUser, deleteUser, listAllCertificates };
