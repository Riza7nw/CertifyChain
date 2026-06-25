// src/db/index.js
// Membuka read-model & merakit repository. Mendukung 2 driver via DB_DRIVER:
//   - "sqlite"   : node:sqlite (default, dev, zero-config)
//   - "postgres" : PostgreSQL via Prisma
// Interface repository SAMA & ASYNC untuk keduanya -> caller tidak peduli driver.

const config = require("../config");

let repos;

if (config.dbDriver === "postgres") {
  // ---- PostgreSQL (Prisma) ----
  const prisma = require("./prismaClient");
  repos = {
    driver: "postgres",
    client: prisma,
    meta: {
      async get(key) {
        const row = await prisma.meta.findUnique({ where: { key } });
        return row ? row.value : null;
      },
      async set(key, value) {
        await prisma.meta.upsert({
          where: { key },
          create: { key, value: String(value) },
          update: { value: String(value) },
        });
      },
    },
    institutions: require("./repositories/institutions.pg.repo")(prisma),
    certificates: require("./repositories/certificates.pg.repo")(prisma),
    verifications: require("./repositories/verifications.pg.repo")(prisma),
  };
} else {
  // ---- SQLite (node:sqlite, default) ----
  const fs = require("fs");
  const path = require("path");
  const { DatabaseSync } = require("node:sqlite");
  const schema = require("./schema");

  const dir = path.dirname(config.dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const db = new DatabaseSync(config.dbPath);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec(schema);

  // Migrasi ringan: pastikan kolom PDF (Fase A) ada di DB sqlite lama.
  const ensureCol = (table, col, ddl) => {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
    if (!cols.includes(col)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  };
  ensureCol("certificates", "template_key", "template_key TEXT");
  ensureCol("certificates", "artifact_type", "artifact_type TEXT NOT NULL DEFAULT 'uploaded'");
  ensureCol("certificates", "pdf_hash", "pdf_hash TEXT");
  ensureCol("certificates", "signed", "signed INTEGER NOT NULL DEFAULT 0");
  ensureCol("certificates", "render_status", "render_status TEXT NOT NULL DEFAULT 'done'");

  repos = {
    driver: "sqlite",
    client: db,
    meta: {
      async get(key) {
        const row = db.prepare(`SELECT value FROM meta WHERE key = ?`).get(key);
        return row ? row.value : null;
      },
      async set(key, value) {
        db.prepare(
          `INSERT INTO meta (key, value) VALUES (?, ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value`
        ).run(key, String(value));
      },
    },
    institutions: require("./repositories/institutions.repo")(db),
    certificates: require("./repositories/certificates.repo")(db),
    verifications: require("./repositories/verifications.repo")(db),
  };
}

module.exports = repos;
