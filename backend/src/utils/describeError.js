// src/utils/describeError.js
// Membongkar error ethers.js (dan error jaringan low-level) menjadi laporan yang
// lengkap & terbaca. Berguna untuk "could not coalesce error" — pesan utama ethers
// menyembunyikan penyebab asli di dalam err.errors[] / err.info / err.cause.

/**
 * Format detail error secara rekursif (message, code, info RPC, cause, errors[]).
 * @param {unknown} err
 * @param {number} depth
 * @returns {string}
 */
function describeError(err, depth = 0) {
  const pad = "  ".repeat(depth + 1);
  if (err === null || err === undefined) return `${pad}(kosong)`;
  if (typeof err !== "object") return `${pad}${String(err)}`;

  const lines = [];
  const push = (label, val) => {
    if (val !== undefined && val !== null && val !== "") lines.push(`${pad}${label}: ${val}`);
  };

  push("message", err.shortMessage || err.message);
  push("code", err.code);
  // Kode jaringan low-level (DNS/socket)
  push("errno", err.errno);
  push("syscall", err.syscall);
  push("hostname", err.hostname);

  // Detail HTTP/JSON-RPC dari ethers (status, body, payload error)
  if (err.info && typeof err.info === "object") {
    push("responseStatus", err.info.responseStatus);
    if (err.info.error) {
      try {
        push("rpcError", JSON.stringify(err.info.error));
      } catch {
        /* ignore */
      }
    }
    try {
      const infoStr = JSON.stringify(err.info);
      if (infoStr && infoStr !== "{}") {
        push("info", infoStr.length > 800 ? infoStr.slice(0, 800) + "…(dipotong)" : infoStr);
      }
    } catch {
      /* ignore non-serializable */
    }
  }

  // Error provider yang dibungkus
  if (err.error && err.error !== err) {
    lines.push(`${pad}-> error:`);
    lines.push(describeError(err.error, depth + 1));
  }
  // Penyebab dasar (mis. FetchError jaringan)
  if (err.cause && err.cause !== err) {
    lines.push(`${pad}-> cause:`);
    lines.push(describeError(err.cause, depth + 1));
  }
  // "could not coalesce error" -> daftar error asli ada di sini
  if (Array.isArray(err.errors) && err.errors.length) {
    lines.push(`${pad}-> errors[${err.errors.length}]:`);
    for (const e of err.errors) lines.push(describeError(e, depth + 1));
  }

  return lines.join("\n");
}

/**
 * Menebak penyebab paling mungkin dari teks error (untuk diagnosis cepat).
 * @param {unknown} err
 * @returns {string|null}
 */
function hintFromError(err) {
  let blob = "";
  try {
    blob = describeError(err).toLowerCase();
  } catch {
    blob = String(err?.message || err).toLowerCase();
  }

  const has = (...keys) => keys.some((k) => blob.includes(k));

  if (has("invalid url", "err_invalid_url", "cannot parse")) {
    return "FORMAT URL SALAH — RPC_URL bukan URL valid. Pastikan diawali https:// (atau wss://) dan tanpa spasi/tanda kutip.";
  }
  if (has("401", "unauthorized", "invalid api key", "invalid project id", "must be authenticated", "forbidden", "403")) {
    return "API KEY DITOLAK — endpoint mengembalikan 401/403. Cek API key di RPC_URL (Alchemy/Infura), apakah benar & aktif untuk jaringan yang dipilih.";
  }
  if (has("429", "rate limit", "too many requests")) {
    return "RATE LIMITED — terlalu banyak request (429). Naikkan INDEXER_POLL_MS atau pakai tier RPC lebih tinggi.";
  }
  if (has("econnrefused")) {
    return "KONEKSI DITOLAK — tidak ada node di alamat itu (mis. RPC_URL=http://localhost:8545 tapi node lokal tidak jalan).";
  }
  if (has("enotfound", "eai_again", "getaddrinfo")) {
    return "HOST TIDAK DITEMUKAN — DNS gagal. Cek typo di host RPC_URL / koneksi internet.";
  }
  if (has("etimedout", "timeout", "network timeout")) {
    return "TIMEOUT — RPC tidak merespons tepat waktu. Cek jaringan/firewall atau ganti endpoint.";
  }
  if (has("could not detect network", "failed to detect network")) {
    return "JARINGAN TAK TERDETEKSI — URL mungkin mengarah ke halaman non-JSON-RPC (mis. HTML), atau salah chain. Cek lagi RPC_URL & CHAIN_ID.";
  }
  if (has("fetch failed", "network error")) {
    return "GAGAL FETCH — masalah jaringan ke RPC. Cek konektivitas & URL.";
  }
  return null;
}

module.exports = { describeError, hintFromError };
