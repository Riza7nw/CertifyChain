// src/auth/auth.js
// Helper terpusat untuk mengelola token admin (JWT) di localStorage.
// Dipakai oleh certificateApi (kirim header), RequireAuth (guard), & Layout (logout).

const TOKEN_KEY = "cc_token";

/** Ambil token tersimpan, atau null bila tidak ada. */
export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    // localStorage bisa tidak tersedia (mode privat ketat) — anggap belum login.
    return null;
  }
}

/** Simpan token hasil login. */
export function setToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* abaikan — gagal menyimpan token */
  }
}

/** Hapus token (logout / token kedaluwarsa). */
export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* abaikan */
  }
}

/** True bila ada token tersimpan (login admin). */
export function isAuthenticated() {
  return Boolean(getToken());
}
