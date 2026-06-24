// src/controllers/v1.auth.controller.js
// Endpoint auth multi-tenant: register (signup org), login, refresh, logout, me.
//
// CATATAN: untuk slice fondasi ini, refreshToken dikembalikan di body JSON
// (mudah diuji & diintegrasikan). Hardening httpOnly cookie + CORS credentials
// menyusul saat wiring frontend.

const authService = require("../services/auth.service");
const prisma = require("../db/prismaClient");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function slugify(s) {
  return (
    String(s)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "org"
  );
}

/** POST /api/v1/auth/register — buat user + organisasi + membership OrgAdmin. */
const register = asyncHandler(async (req, res) => {
  const { email, password, name, orgName } = req.body || {};
  if (!email || !EMAIL_RE.test(email)) throw new AppError("Email tidak valid.", 400, "VALIDATION_ERROR");
  if (!password || password.length < 8) throw new AppError("Password minimal 8 karakter.", 400, "VALIDATION_ERROR");
  if (!orgName || !String(orgName).trim()) throw new AppError("orgName wajib diisi.", 400, "VALIDATION_ERROR");

  if (await prisma.users.findUnique({ where: { email } })) {
    throw new AppError("Email sudah terdaftar.", 409, "EMAIL_EXISTS");
  }

  // Slug unik
  const base = slugify(orgName);
  let slug = base;
  for (let i = 1; await prisma.organizations.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;

  const password_hash = await authService.hashPassword(password);
  const { user, org } = await prisma.$transaction(async (tx) => {
    const u = await tx.users.create({ data: { email, password_hash, name: name ?? null } });
    const o = await tx.organizations.create({ data: { name: String(orgName).trim(), slug } });
    await tx.memberships.create({ data: { user_id: u.id, organization_id: o.id, role: "OrgAdmin" } });
    return { user: u, org: o };
  });

  const accessToken = authService.signAccessToken(user);
  const refreshToken = await authService.issueRefreshToken(user.id);

  res.status(201).json({
    success: true,
    data: {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email },
      org: { id: org.id, slug: org.slug, name: org.name, role: "OrgAdmin" },
    },
  });
});

/** POST /api/v1/auth/login */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) throw new AppError("email & password wajib diisi.", 400, "VALIDATION_ERROR");

  const user = await prisma.users.findUnique({ where: { email } });
  const ok = user && (await authService.verifyPassword(password, user.password_hash));
  if (!ok) throw new AppError("Email atau password salah.", 401, "INVALID_CREDENTIALS");

  const accessToken = authService.signAccessToken(user);
  const refreshToken = await authService.issueRefreshToken(user.id);
  res.json({ success: true, data: { accessToken, refreshToken } });
});

/** POST /api/v1/auth/refresh — rotasi refresh token, keluarkan access baru. */
const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) throw new AppError("refreshToken wajib.", 400, "VALIDATION_ERROR");

  const rotated = await authService.rotateRefreshToken(refreshToken);
  if (!rotated) throw new AppError("Refresh token tidak valid atau kedaluwarsa.", 401, "INVALID_REFRESH");

  const user = await prisma.users.findUnique({ where: { id: rotated.userId } });
  const accessToken = authService.signAccessToken(user);
  res.json({ success: true, data: { accessToken, refreshToken: rotated.raw } });
});

/** POST /api/v1/auth/logout — cabut refresh token. */
const logout = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body || {};
  if (refreshToken) await authService.revokeRefreshToken(refreshToken);
  res.json({ success: true, message: "Berhasil logout." });
});

/** GET /api/v1/auth/me — profil + memberships (butuh access token). */
const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.authUser });
});

module.exports = { register, login, refresh, logout, me };
