// src/services/auth.service.js
// Primitif autentikasi multi-tenant (Postgres/Prisma):
//  - password hashing (bcrypt)
//  - access token (JWT pendek)
//  - refresh token (acak, DISIMPAN sebagai sha256 hash -> bisa di-rotate & dicabut)

const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../db/prismaClient");
const config = require("../config");

const SALT_ROUNDS = 10;

function hashPassword(pw) {
  return bcrypt.hash(pw, SALT_ROUNDS);
}
function verifyPassword(pw, hash) {
  return bcrypt.compare(pw, hash);
}

// Access token: payload minimal (sub=userId, pa=isPlatformAdmin). Memberships
// dimuat dari DB saat request (selalu up-to-date, tidak ikut di token).
function signAccessToken(user) {
  return jwt.sign({ email: user.email, pa: user.is_platform_admin }, config.jwtSecret, {
    subject: String(user.id),
    expiresIn: config.accessTokenTtl,
  });
}
function verifyAccessToken(token) {
  return jwt.verify(token, config.jwtSecret); // throws bila invalid/expired
}

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

async function issueRefreshToken(userId) {
  const raw = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + config.refreshTokenTtlDays * 86400000);
  await prisma.refresh_tokens.create({
    data: { user_id: userId, token_hash: sha256(raw), expires_at: expires },
  });
  return raw;
}

// Rotasi: validasi token lama, cabut, terbitkan yang baru.
async function rotateRefreshToken(raw) {
  const rec = await prisma.refresh_tokens.findUnique({ where: { token_hash: sha256(raw) } });
  if (!rec || rec.revoked || rec.expires_at < new Date()) return null;
  await prisma.refresh_tokens.update({ where: { id: rec.id }, data: { revoked: true } });
  const newRaw = await issueRefreshToken(rec.user_id);
  return { userId: rec.user_id, raw: newRaw };
}

async function revokeRefreshToken(raw) {
  await prisma.refresh_tokens.updateMany({ where: { token_hash: sha256(raw) }, data: { revoked: true } });
}

async function getUserWithMemberships(userId) {
  return prisma.users.findUnique({
    where: { id: userId },
    include: { memberships: { include: { organization: true } } },
  });
}

module.exports = {
  hashPassword,
  verifyPassword,
  signAccessToken,
  verifyAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  getUserWithMemberships,
};
