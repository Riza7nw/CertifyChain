// src/services/audit.service.js
// Audit log sederhana berbasis file (format JSON Lines / .log).
// Mencatat setiap penerbitan sertifikat & event keamanan (login).
//
// Catatan: ini audit log SISI BACKEND (siapa admin yang memicu, IP, kapan).
// Audit log yang TIDAK BISA DIUBAH tetap ada di blockchain (event CertificateIssued
// + field issuedBy). Untuk produksi skala besar, ganti file ini dengan DB / SIEM.

const fs = require("fs");
const path = require("path");

const LOG_DIR = path.join(__dirname, "..", "..", "logs");
const LOG_FILE = path.join(LOG_DIR, "audit.log");

function ensureDir() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Mencatat satu entri audit (ditambahkan, tidak pernah ditimpa).
 * @param {object} event mis. { type, admin, ip, certificateId, txHash }
 */
function record(event) {
  try {
    ensureDir();
    const entry = { timestamp: new Date().toISOString(), ...event };
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + "\n", "utf8");
    return entry;
  } catch (err) {
    // Audit tidak boleh menjatuhkan request utama; cukup log ke console.
    console.error("[AUDIT] gagal menulis log:", err.message);
    return null;
  }
}

/**
 * Mengambil N entri audit terakhir (terbaru dulu).
 */
function getRecent(limit = 50) {
  ensureDir();
  if (!fs.existsSync(LOG_FILE)) return [];
  const lines = fs.readFileSync(LOG_FILE, "utf8").split("\n").filter(Boolean);
  return lines
    .slice(-limit)
    .reverse()
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return { raw: line };
      }
    });
}

module.exports = { record, getRecent };
