// src/db/repositories/institutions.pg.repo.js
// Implementasi Postgres (Prisma). Interface IDENTIK dgn institutions.repo.js (sqlite),
// tapi async. Field hasil query snake_case -> bentuk row sama dgn versi sqlite.
module.exports = (prisma) => ({
  async upsert(inst) {
    const active = inst.active === false ? false : true;
    await prisma.institutions.upsert({
      where: { id: inst.id },
      create: {
        id: inst.id,
        name: inst.name ?? "",
        metadata_cid: inst.metadataCid ?? null,
        admin_address: inst.adminAddress ?? null,
        active,
        tx_hash: inst.txHash ?? null,
        block_number: inst.blockNumber ?? null,
      },
      // COALESCE behaviour: undefined = jangan ubah (jaga nilai lama saat indexer reconcile).
      update: {
        name: inst.name ?? undefined,
        metadata_cid: inst.metadataCid ?? undefined,
        admin_address: inst.adminAddress ?? undefined,
        active,
        tx_hash: inst.txHash ?? undefined,
        block_number: inst.blockNumber ?? undefined,
      },
    });
  },

  async setActive(id, active) {
    await prisma.institutions.updateMany({ where: { id }, data: { active: !!active } });
  },

  async get(id) {
    return prisma.institutions.findUnique({ where: { id } });
  },

  async list() {
    return prisma.institutions.findMany({ orderBy: { id: "asc" } });
  },

  async count() {
    return prisma.institutions.count();
  },
});
