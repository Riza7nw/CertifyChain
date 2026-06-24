// src/middlewares/userAuth.js
// Middleware auth multi-tenant (Langkah 2). TERPISAH dari middlewares/auth.js
// (admin tunggal lama) -> keduanya hidup berdampingan selama transisi.

const authService = require("../services/auth.service");
const asyncHandler = require("../utils/asyncHandler");
const AppError = require("../utils/AppError");

// Verifikasi access token -> muat user + memberships -> req.authUser
const authenticateUser = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return next(new AppError("Akses ditolak. Sertakan Authorization: Bearer <token>.", 401, "NO_TOKEN"));
  }

  let payload;
  try {
    payload = authService.verifyAccessToken(token);
  } catch (err) {
    const code = err.name === "TokenExpiredError" ? "TOKEN_EXPIRED" : "INVALID_TOKEN";
    return next(new AppError("Token tidak valid atau kedaluwarsa.", 401, code));
  }

  const user = await authService.getUserWithMemberships(Number(payload.sub));
  if (!user) return next(new AppError("User tidak ditemukan.", 401, "USER_NOT_FOUND"));

  req.authUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    isPlatformAdmin: user.is_platform_admin,
    memberships: user.memberships.map((m) => ({
      orgId: m.organization_id,
      orgSlug: m.organization.slug,
      orgName: m.organization.name,
      onchainInstitutionId: m.organization.onchain_institution_id,
      role: m.role,
    })),
  };
  next();
});

// Hanya platform admin.
function requirePlatformAdmin(req, res, next) {
  if (!req.authUser?.isPlatformAdmin) {
    return next(new AppError("Khusus platform admin.", 403, "FORBIDDEN"));
  }
  next();
}

/**
 * Membatasi akses pada organisasi tertentu + role tertentu (tenant-scoping).
 * @param {string[]} roles role yang diizinkan (mis. ["OrgAdmin","Issuer"])
 * @param {(req)=>number} getOrgId cara mengambil orgId dari request (default :orgId)
 * Platform admin selalu lolos.
 */
function requireOrgRole(roles, getOrgId = (req) => Number(req.params.orgId)) {
  return (req, res, next) => {
    if (req.authUser?.isPlatformAdmin) return next();
    const orgId = getOrgId(req);
    const m = req.authUser?.memberships?.find((x) => x.orgId === orgId);
    if (!m || !roles.includes(m.role)) {
      return next(new AppError("Anda tidak memiliki akses ke organisasi ini.", 403, "FORBIDDEN_ORG"));
    }
    req.orgRole = m.role;
    next();
  };
}

module.exports = { authenticateUser, requirePlatformAdmin, requireOrgRole };
