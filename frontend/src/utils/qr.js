// src/utils/qr.js
// Util untuk mengenali certificateId dari hasil scan/input QR.
// QR biasanya berisi URL (mis. https://app/verify/0x...), tapi bisa juga
// langsung berupa certificateId. Fungsi ini menormalkan keduanya.

const BYTES32 = /^0x[0-9a-fA-F]{64}$/;
const BYTES32_ANY = /0x[0-9a-fA-F]{64}/;

/** Apakah string adalah certificateId (bytes32 hex) yang valid? */
export function isBytes32(value) {
  return typeof value === "string" && BYTES32.test(value.trim());
}

/**
 * Ambil certificateId dari teks hasil scan / input.
 * Mendukung: id mentah, URL "/verify/:id", atau URL "?id=...".
 * @returns {string|null} certificateId, atau null jika tidak ditemukan.
 */
export function extractCertificateId(text) {
  if (!text) return null;
  const t = String(text).trim();

  // 1. Sudah berupa certificateId
  if (BYTES32.test(t)) return t;

  // 2. Coba parse sebagai URL
  try {
    const url = new URL(t);
    const segments = url.pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1];
    if (last && BYTES32.test(last)) return last;

    const queryId = url.searchParams.get("id");
    if (queryId && BYTES32.test(queryId)) return queryId;
  } catch {
    /* bukan URL valid */
  }

  // 3. Fallback: cari pola 0x... di mana pun dalam teks
  const match = t.match(BYTES32_ANY);
  return match ? match[0] : null;
}
