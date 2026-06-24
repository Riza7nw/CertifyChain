// src/config/index.js
// Memuat & memvalidasi variabel lingkungan (env) di satu tempat.
// Jika ada env wajib yang kosong, aplikasi langsung berhenti dengan pesan jelas.

require("dotenv").config();
const path = require("path");

/**
 * Ambil env wajib. Lempar error fatal kalau kosong supaya kesalahan
 * konfigurasi ketahuan saat startup, bukan saat request masuk.
 */
function required(key) {
  const value = process.env[key];
  if (!value || value.trim() === "") {
    throw new Error(`[CONFIG] Variabel lingkungan "${key}" wajib diisi di file .env`);
  }
  return value.trim();
}

const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  rpcUrl: required("RPC_URL"),
  privateKey: required("PRIVATE_KEY"),
  contractAddress: required("CONTRACT_ADDRESS"),
  chainId: process.env.CHAIN_ID ? parseInt(process.env.CHAIN_ID, 10) : undefined,
  // URL frontend publik untuk membentuk link verifikasi di dalam QR Code.
  publicBaseUrl: (process.env.PUBLIC_BASE_URL || "http://localhost:5173").replace(/\/+$/, ""),

  // --- Security / JWT ---
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1h", // token admin lama (/api/auth)
  adminUsername: required("ADMIN_USERNAME"),
  adminPasswordHash: required("ADMIN_PASSWORD_HASH"),

  // --- Multi-tenant auth (Langkah 2, /api/v1/auth) ---
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL || "15m",
  refreshTokenTtlDays: parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || "7", 10),

  // --- Database (read-model untuk dashboard & statistik) ---
  // Driver: "sqlite" (node:sqlite, default) atau "postgres" (Prisma).
  // Repository interface sama (async) untuk keduanya -> swappable.
  dbDriver: (process.env.DB_DRIVER || "sqlite").toLowerCase(),
  dbPath: process.env.DB_PATH || path.join(__dirname, "..", "..", "data", "certifychain.db"),

  // --- Penyimpanan file (IPFS) ---
  storage: {
    provider: process.env.STORAGE_PROVIDER || "local", // local | ipfs | pinata
    localDir: path.join(__dirname, "..", "..", "storage", "ipfs"),
    ipfsApiUrl: process.env.IPFS_API_URL || "http://127.0.0.1:5001", // Kubo daemon
    pinataJwt: process.env.PINATA_JWT || "",
    gatewayBase:
      process.env.IPFS_GATEWAY_BASE ||
      ((process.env.STORAGE_PROVIDER || "local") === "local"
        ? "/api/files"
        : "https://ipfs.io/ipfs"),
  },

  // Interval polling indexer (ms) untuk jaringan tanpa websocket.
  indexerPollMs: parseInt(process.env.INDEXER_POLL_MS || "5000", 10),
  // Maksimum rentang blok per request eth_getLogs.
  // Default 1000 (hemat API call). CATATAN: Alchemy/Infura FREE tier membatasi
  // eth_getLogs maks 10 blok -> di tier itu nilai >10 akan ditolak (error -32600).
  // Pakai 1000 hanya bila RPC mengizinkan (PAYG/self-host); turunkan ke 10 untuk free tier.
  // Nama kanonik: INDEXER_MAX_BLOCK_RANGE. Alias INDEXER_CHUNK_SIZE didukung.
  indexerMaxBlockRange: parseInt(
    process.env.INDEXER_MAX_BLOCK_RANGE || process.env.INDEXER_CHUNK_SIZE || "1000",
    10
  ),
  // Blok awal backfill (isi dengan blok deployment kontrak agar tidak scan dari 0).
  indexerStartBlock: parseInt(process.env.INDEXER_START_BLOCK || "0", 10),
  // Batas jumlah chunk per siklus. Default 5 -> ramah rate-limit free tier (Alchemy).
  indexerMaxChunksPerCycle: parseInt(process.env.INDEXER_MAX_CHUNKS_PER_CYCLE || "5", 10),
  // Jeda (ms) setelah SETIAP request getLogs -> hindari error 429 (rate limit).
  indexerRequestDelayMs: parseInt(process.env.INDEXER_REQUEST_DELAY_MS || "1000", 10),
};

// Guard tambahan: tolak JWT_SECRET yang terlalu pendek / nilai default contoh.
if (config.jwtSecret.length < 32) {
  throw new Error("[CONFIG] JWT_SECRET terlalu pendek (min 32 karakter). Gunakan string acak.");
}

module.exports = config;
