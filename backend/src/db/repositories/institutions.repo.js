// src/db/repositories/institutions.repo.js
// Implementasi node:sqlite. Method dibuat `async` agar interface seragam dengan
// versi Postgres (Prisma) -> driver bisa di-swap tanpa mengubah caller.
module.exports = (db) => {
  const upsertStmt = db.prepare(`
    INSERT INTO institutions (id, name, metadata_cid, admin_address, active, tx_hash, block_number)
    VALUES (@id, @name, @metadata_cid, @admin_address, @active, @tx_hash, @block_number)
    ON CONFLICT(id) DO UPDATE SET
      name          = COALESCE(excluded.name, institutions.name),
      metadata_cid  = COALESCE(excluded.metadata_cid, institutions.metadata_cid),
      admin_address = COALESCE(excluded.admin_address, institutions.admin_address),
      active        = excluded.active,
      tx_hash       = COALESCE(excluded.tx_hash, institutions.tx_hash),
      block_number  = COALESCE(excluded.block_number, institutions.block_number)
  `);

  return {
    async upsert(inst) {
      upsertStmt.run({
        id: inst.id,
        name: inst.name ?? null,
        metadata_cid: inst.metadataCid ?? null,
        admin_address: inst.adminAddress ?? null,
        active: inst.active === false ? 0 : 1,
        tx_hash: inst.txHash ?? null,
        block_number: inst.blockNumber ?? null,
      });
    },
    async setActive(id, active) {
      db.prepare(`UPDATE institutions SET active = ? WHERE id = ?`).run(active ? 1 : 0, id);
    },
    async get(id) {
      return db.prepare(`SELECT * FROM institutions WHERE id = ?`).get(id) || null;
    },
    async list() {
      return db.prepare(`SELECT * FROM institutions ORDER BY id ASC`).all();
    },
    async count() {
      return db.prepare(`SELECT COUNT(*) AS n FROM institutions`).get().n;
    },
  };
};
