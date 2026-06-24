// src/db/schema.js
// Skema read-model. Dibuat idempotent (IF NOT EXISTS) agar aman dijalankan berulang.
// Read-model = proyeksi data dari blockchain (via indexer) + write path (API),
// dioptimalkan untuk QUERY (dashboard & statistik), bukan sebagai source of truth.

module.exports = `
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS institutions (
  id            INTEGER PRIMARY KEY,
  name          TEXT NOT NULL,
  metadata_cid  TEXT,
  admin_address TEXT,
  active        INTEGER NOT NULL DEFAULT 1,
  tx_hash       TEXT,
  block_number  INTEGER,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS certificates (
  certificate_id TEXT PRIMARY KEY,
  institution_id INTEGER NOT NULL,
  recipient_name TEXT,                       -- PII: off-chain (tidak di blockchain)
  file_cid       TEXT,                        -- IPFS CID file sertifikat
  data_hash      TEXT,
  issued_by      TEXT,
  status         TEXT NOT NULL DEFAULT 'valid', -- valid | revoked | pending
  tx_hash        TEXT,
  block_number   INTEGER,
  issued_at      TEXT,                         -- ISO; substr(.,1,10) -> hari
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_cert_inst      ON certificates(institution_id);
CREATE INDEX IF NOT EXISTS idx_cert_issued_at ON certificates(issued_at);

CREATE TABLE IF NOT EXISTS verifications (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  certificate_id TEXT,
  institution_id INTEGER,
  valid          INTEGER,
  ip             TEXT,
  day            TEXT NOT NULL,               -- YYYY-MM-DD (untuk statistik harian)
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ver_day  ON verifications(day);
CREATE INDEX IF NOT EXISTS idx_ver_inst ON verifications(institution_id);
`;
