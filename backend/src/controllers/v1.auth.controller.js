// src/controllers/v1.auth.controller.js
// Endpoint auth multi-tenant: register (signup org), login, refresh, logout, me.
//
// CATATAN: untuk slice fondasi ini, refreshToken dikembalikan di body JSON
// (mudah diuji & diintegrasikan). Hardening httpOnly cookie + CORS credentials
// menyusul saat wiring frontend.

const authService = require("../services/auth.service");
const prisma = require("../db/prismaClient");
const config = require("../config");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REFRESH_COOKIE = "cc_refresh";

// Refresh token disimpan sebagai cookie httpOnly (tak terbaca JS -> anti-XSS).
// Path dibatasi ke /api/v1/auth supaya cookie hanya dikirim ke endpoint auth.
function refreshCookieOpts() {
  return {
    httpOnly: true,
    secure: config.cookieSecure, // true di produksi (HTTPS)
    sameSite: "lax",
    path: "/api/v1/auth",
    maxAge: config.refreshTokenTtlDays * 86400000,
  };
}
const setRefreshCookie = (res, token) => res.cookie(REFRESH_COOKIE, token, refreshCookieOpts());
const clearRefreshCookie = (res) =>
  res.clearCookie(REFRESH_COOKIE, { httpOnly: true, secure: config.cookieSecure, sameSite: "lax", path: "/api/v1/auth" });
const readRefresh = (req) => req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken;

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
  // orgName OPSIONAL (Phase 7):
  //  - ada  -> signup INSTITUSI (user + org + membership OrgAdmin)
  //  - kosong -> signup PENERIMA (user saja, role 'user' default, tanpa org)
  if (await prisma.users.findUnique({ where: { email } })) {
    throw new AppError("Email sudah terdaftar.", 409, "EMAIL_EXISTS");
  }

  const password_hash = await authService.hashPassword(password);
  const wantsOrg = orgName && String(orgName).trim();

  let user;
  let org = null;
  if (wantsOrg) {
    const base = slugify(orgName);
    let slug = base;
    for (let i = 1; await prisma.organizations.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;
    const r = await prisma.$transaction(async (tx) => {
      const u = await tx.users.create({ data: { email, password_hash, name: name ?? null } });
      const o = await tx.organizations.create({ data: { name: String(orgName).trim(), slug } });
      await tx.memberships.create({ data: { user_id: u.id, organization_id: o.id, role: "OrgAdmin" } });
      return { u, o };
    });
    user = r.u;
    org = r.o;
  } else {
    user = await prisma.users.create({ data: { email, password_hash, name: name ?? null } });
  }

  // TODO (slice berikut): kirim token verifikasi email.
  const accessToken = authService.signAccessToken(user);
  const refreshToken = await authService.issueRefreshToken(user.id);
  setRefreshCookie(res, refreshToken);

  res.status(201).json({
    success: true,
    data: {
      accessToken,
      refreshToken, // juga di-set sebagai cookie httpOnly; klien browser pakai cookie
      user: { id: user.id, email: user.email, role: user.role },
      org: org ? { id: org.id, slug: org.slug, name: org.name, role: "OrgAdmin" } : null,
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
  setRefreshCookie(res, refreshToken);
  res.json({ success: true, data: { accessToken, refreshToken } });
});

/** POST /api/v1/auth/refresh — rotasi refresh token (dari cookie atau body). */
const refresh = asyncHandler(async (req, res) => {
  const presented = readRefresh(req);
  if (!presented) throw new AppError("refreshToken wajib (cookie atau body).", 400, "VALIDATION_ERROR");

  const rotated = await authService.rotateRefreshToken(presented);
  if (!rotated) throw new AppError("Refresh token tidak valid atau kedaluwarsa.", 401, "INVALID_REFRESH");

  const user = await prisma.users.findUnique({ where: { id: rotated.userId } });
  const accessToken = authService.signAccessToken(user);
  setRefreshCookie(res, rotated.raw);
  res.json({ success: true, data: { accessToken, refreshToken: rotated.raw } });
});

/** POST /api/v1/auth/logout — cabut refresh token + hapus cookie. */
const logout = asyncHandler(async (req, res) => {
  const presented = readRefresh(req);
  if (presented) await authService.revokeRefreshToken(presented);
  clearRefreshCookie(res);
  res.json({ success: true, message: "Berhasil logout." });
});

/** GET /api/v1/auth/me — profil + memberships (butuh access token). */
const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: req.authUser });
});

module.exports = { register, login, refresh, logout, me };
