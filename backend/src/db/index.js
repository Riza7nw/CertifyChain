// src/db/index.js
// Membuka koneksi DB (read-model) & merakit repository.
//
// Implementasi DEV: node:sqlite (bawaan Node, zero-config, tanpa native build).
// Implementasi PROD: ganti modul ini dengan PostgreSQL (mis. node-postgres),
// JAGA bentuk objek repository tetap sama -> sisa aplikasi tidak perlu berubah.
//
// Inilah inti pola "scalable read path": dashboard & statistik query ke DB ini,
// BUKAN ke node blockchain.

const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");
const config = require("../config");
const schema = require("./schema");

// Pastikan folder DB ada.
const dir = path.dirname(config.dbPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new DatabaseSync(config.dbPath);
db.exec("PRAGMA journal_mode = WAL;"); // konkurensi baca lebih baik
db.exec(schema);

// Meta key-value (mis. lastProcessedBlock untuk indexer).
const meta = {
  get(key) {
    const row = db.prepare(`SELECT value FROM meta WHERE key = ?`).get(key);
    return row ? row.value : null;
  },
  set(key, value) {
    db.prepare(
      `INSERT INTO meta (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    ).run(key, String(value));
  },
};

module.exports = {
  db,
  meta,
  institutions: require("./repositories/institutions.repo")(db),
  certificates: require("./repositories/certificates.repo")(db),
  verifications: require("./repositories/verifications.repo")(db),
};
