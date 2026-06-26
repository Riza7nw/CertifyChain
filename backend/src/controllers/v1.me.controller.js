// src/controllers/v1.me.controller.js
// Phase 7c — self-service penerima sertifikat. Semua endpoint scoped ke email
// user yang login: user hanya melihat/mengunduh sertifikat yang recipient_email-nya
// sama dengan email akunnya. Identity store (certificate_downloads) = Postgres-only,
// jadi controller ini memakai prisma langsung (selaras v1.org.controller).

const prisma = require("../db/prismaClient");
const db = require("../db");
const storage = require("../storage");
const blockchainService = require("../services/blockchain.service");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");
const { isPrivateCert } = require("../utils/certPrivacy");
const { sendCertificateFile } = require("../services/fileDelivery");

// Bentuk item sertifikat untuk respons (tanpa membocorkan field internal).
// fileUrl publik hanya untuk file uploaded; file generated (privat) diunduh lewat
// endpoint /download terotentikasi (Fase C3).
function toItem(r) {
  const privateFile = isPrivateCert(r);
  return {
    certificateId: r.certificate_id,
    institutionId: r.institution_id,
    recipientName: r.recipient_name,
    recipientEmail: r.recipient_email,
    fileCid: r.file_cid,
    fileUrl: !privateFile && r.file_cid ? storage.gatewayUrl(r.file_cid) : null,
    fileAccess: privateFile ? "private" : "public",
    status: r.status,
    issuedAt: r.issued_at,
    txHash: r.tx_hash,
  };
}

// Muat sertifikat dari read-model & pastikan dimiliki oleh user (recipient_email).
// 404 bila tidak ada; 403 bila ada tapi bukan milik user (hindari membuka isi cert).
async function loadOwnedCertificate(req) {
  const certId = req.params.certId;
  const cert = await db.certificates.get(certId);
  if (!cert) throw new AppError("Sertifikat tidak ditemukan.", 404, "CERT_NOT_FOUND");
  const owns =
    cert.recipient_email &&
    cert.recipient_email.toLowerCase() === req.authUser.email.toLowerCase();
  if (!owns) throw new AppError("Sertifikat ini bukan milik Anda.", 403, "NOT_OWNER");
  return cert;
}

/** GET /api/v1/me/certificates — daftar sertifikat milik penerima (paginasi). */
const listMyCertificates = asyncHandler(async (req, res) => {
  const email = req.authUser.email;
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const offset = (page - 1) * limit;

  const [total, rows] = await Promise.all([
    db.certificates.countByRecipientEmail(email),
    db.certificates.listByRecipientEmail(email, { limit, offset }),
  ]);

  res.json({
    success: true,
    data: {
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      items: rows.map(toItem),
    },
  });
});

/**
 * GET /api/v1/me/certificates/:certId/download
 * Unduh file sertifikat milik user (akses-terkontrol). Provider lokal -> stream file;
 * provider IPFS/Pinata -> arahkan ke gateway. Setiap unduhan dicatat (audit).
 */
const downloadMyCertificate = asyncHandler(async (req, res) => {
  const cert = await loadOwnedCertificate(req);
  if (!cert.file_cid) throw new AppError("Sertifikat ini tidak memiliki file.", 404, "NO_FILE");

  // Catat audit unduhan (best-effort; jangan gagalkan unduhan bila gagal).
  try {
    await prisma.certificate_downloads.create({
      data: { certificate_id: cert.certificate_id, user_id: req.authUser.id, ip: req.ip || null },
    });
  } catch (e) {
    console.error("[me.download] gagal catat audit unduhan:", e.message);
  }

  // Kirim file (lokal -> attachment; IPFS/Pinata -> redirect gateway). Logika
  // pengiriman dipakai bersama dengan endpoint unduhan staf (Fase C3).
  return sendCertificateFile(res, cert);
});

/**
 * GET /api/v1/me/certificates/:certId/status
 * Status keaslian sertifikat: cek on-chain (sumber kebenaran) + status read-model.
 */
const myCertificateStatus = asyncHandler(async (req, res) => {
  const cert = await loadOwnedCertificate(req);
  const onChainValid = await blockchainService.verifyCertificate(cert.certificate_id);

  res.json({
    success: true,
    data: {
      certificateId: cert.certificate_id,
      onChainValid,
      readModelStatus: cert.status,
      issuedAt: cert.issued_at,
      txHash: cert.tx_hash,
    },
  });
});

module.exports = { listMyCertificates, downloadMyCertificate, myCertificateStatus };
