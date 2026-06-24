// src/api/certificateApi.js
// Satu-satunya tempat frontend berbicara dengan backend.
// Membungkus fetch + menormalkan format error backend:
//   { success: false, error: { code, message } }

import { getToken, clearToken } from "../auth/auth";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

// Arahkan ke halaman login (mis. token kedaluwarsa). Hard redirect agar
// state aplikasi yang memerlukan auth ikut ter-reset.
function redirectToLogin() {
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.assign("/login");
  }
}

/**
 * Wrapper fetch dengan error handling konsisten.
 * @param {string} path
 * @param {object} [options] opsi fetch + flag `auth` untuk melampirkan Bearer token.
 * @throws {Error} error.message untuk ditampilkan; error.code dari backend.
 */
async function request(path, options = {}) {
  const { auth = false, headers: extraHeaders, ...rest } = options;

  // Untuk upload file kita kirim FormData. JANGAN set Content-Type manual:
  // browser harus menambahkan sendiri header multipart + boundary-nya.
  const isFormData = typeof FormData !== "undefined" && rest.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...extraHeaders,
  };

  // Lampirkan token untuk endpoint yang butuh auth (mis. issue, audit).
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, { headers, ...rest });
  } catch (networkErr) {
    // Backend mati / tidak terjangkau
    throw new Error(
      "Tidak dapat terhubung ke server backend. Pastikan backend berjalan di port yang benar."
    );
  }

  let body = null;
  try {
    body = await res.json();
  } catch {
    /* response tanpa body JSON */
  }

  // 401 pada request yang butuh auth = token tidak ada / kedaluwarsa / invalid.
  // Bersihkan token & arahkan ke /login. (Login sendiri TIDAK memakai `auth`,
  // jadi 401 "kredensial salah" tetap ditampilkan di form, bukan memicu redirect.)
  if (auth && res.status === 401) {
    clearToken();
    redirectToLogin();
  }

  if (!res.ok || (body && body.success === false)) {
    const message = body?.error?.message || `Permintaan gagal (HTTP ${res.status}).`;
    const err = new Error(message);
    err.code = body?.error?.code;
    err.status = res.status;
    throw err;
  }

  return body?.data;
}

/** POST /auth/login -> { token, tokenType, expiresIn } */
export function loginAdmin({ username, password }) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

/**
 * POST /institutions/:id/certificates  (multipart/form-data, butuh JWT admin)
 * @param {number|string} institutionId
 * @param {FormData} formData berisi field `file` (wajib) + `recipientName` (wajib) + `data` (opsional)
 * Content-Type sengaja TIDAK di-set agar browser menambahkan boundary multipart.
 */
export function issueCertificate(institutionId, formData) {
  return request(`/institutions/${encodeURIComponent(institutionId)}/certificates`, {
    method: "POST",
    auth: true,
    body: formData,
  });
}

/** GET /institutions (publik) -> daftar institusi + jumlah sertifikat */
export function listInstitutions() {
  return request("/institutions");
}

/** GET /institutions/:id (publik) -> detail institusi */
export function getInstitution(id) {
  return request(`/institutions/${encodeURIComponent(id)}`);
}

/** POST /institutions (butuh JWT platform admin) -> { institutionId, txHash, ... } */
export function registerInstitution({ adminAddress, name, metadataCid }) {
  return request("/institutions", {
    method: "POST",
    auth: true,
    body: JSON.stringify({ adminAddress, name, metadataCid: metadataCid || undefined }),
  });
}

/**
 * GET /institutions/:id/certificates?page&limit  (butuh JWT admin)
 * -> { pagination: { page, limit, total, totalPages }, items: [...] }
 */
export function listInstitutionCertificates(id, { page = 1, limit = 20 } = {}) {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  return request(`/institutions/${encodeURIComponent(id)}/certificates?${qs.toString()}`, {
    auth: true,
  });
}

/** GET /stats?days=N (publik) -> { totals, issuedDaily, verifiedDaily } */
export function getStats(days = 30) {
  return request(`/stats?days=${encodeURIComponent(days)}`);
}

/** GET /verify-certificate/:id (publik) */
export function verifyCertificate(id) {
  return request(`/verify-certificate/${encodeURIComponent(id)}`);
}

/** GET /certificate/:id (publik) */
export function getCertificate(id) {
  return request(`/certificate/${encodeURIComponent(id)}`);
}

/** GET /audit?limit=N (butuh JWT admin) -> array entri audit */
export function getAuditLog(limit = 50) {
  return request(`/audit?limit=${encodeURIComponent(limit)}`, { auth: true });
}
