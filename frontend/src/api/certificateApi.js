// src/api/certificateApi.js
// Endpoint PUBLIK (tanpa auth) untuk halaman verifikasi & pencarian sertifikat.
// Endpoint ter-autentikasi memakai apiFetch dari AuthContext (bukan di sini).

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

// Wrapper fetch publik dengan error handling konsisten:
//   { success: false, error: { code, message } }
async function request(path, options = {}) {
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, options);
  } catch {
    throw new Error("Tidak dapat terhubung ke server backend.");
  }

  let body = null;
  try {
    body = await res.json();
  } catch {
    /* respons tanpa body JSON */
  }

  if (!res.ok || (body && body.success === false)) {
    const err = new Error(body?.error?.message || `Permintaan gagal (HTTP ${res.status}).`);
    err.code = body?.error?.code;
    err.status = res.status;
    throw err;
  }
  return body?.data;
}

/** GET /verify-certificate/:id (publik) -> { certificateId, valid, message } */
export function verifyCertificate(id) {
  return request(`/verify-certificate/${encodeURIComponent(id)}`);
}

/** GET /certificate/:id (publik) -> detail gabungan on-chain + read-model */
export function getCertificate(id) {
  return request(`/certificate/${encodeURIComponent(id)}`);
}

/**
 * GET /v1/public/certificates (publik, Phase 7e) — cari by certId dan/atau nama institusi.
 * -> { pagination, items: [{ certificateId, institutionName, status, issuedAt, fileUrl, verifyUrl }] }
 */
export function searchPublicCertificates({ certId, institution, page = 1, limit = 20 } = {}) {
  const qs = new URLSearchParams();
  if (certId) qs.set("certId", certId);
  if (institution) qs.set("institution", institution);
  qs.set("page", String(page));
  qs.set("limit", String(limit));
  return request(`/v1/public/certificates?${qs.toString()}`);
}

/**
 * POST /verify-pdf (publik, Fase B) — unggah PDF untuk cek anti-tamper.
 * -> { match, tampered, onChainValid, certificateId, recipientName, institutionName, status, message }
 */
export function verifyPdfFile(file) {
  const fd = new FormData();
  fd.append("file", file);
  return request("/verify-pdf", { method: "POST", body: fd });
}
