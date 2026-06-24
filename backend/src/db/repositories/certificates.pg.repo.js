// src/db/repositories/certificates.pg.repo.js
// Implementasi Postgres (Prisma). Interface identik certificates.repo.js (sqlite), async.
module.exports = (prisma) => ({
  async upsert(c) {
    await prisma.certificates.upsert({
      where: { certificate_id: c.certificateId },
      create: {
        certificate_id: c.certificateId,
        institution_id: c.institutionId,
        recipient_name: c.recipientName ?? null,
        file_cid: c.fileCid ?? null,
        data_hash: c.dataHash ?? null,
        issued_by: c.issuedBy ?? null,
        status: c.status ?? "valid",
        tx_hash: c.txHash ?? null,
        block_number: c.blockNumber ?? null,
        issued_at: c.issuedAt ?? null,
      },
      update: {
        recipient_name: c.recipientName ?? undefined,
        file_cid: c.fileCid ?? undefined,
        data_hash: c.dataHash ?? undefined,
        issued_by: c.issuedBy ?? undefined,
        status: c.status ?? undefined,
        tx_hash: c.txHash ?? undefined,
        block_number: c.blockNumber ?? undefined,
        issued_at: c.issuedAt ?? undefined,
      },
    });
  },

  async setStatus(certificateId, status) {
    await prisma.certificates.updateMany({ where: { certificate_id: certificateId }, data: { status } });
  },

  async get(certificateId) {
    return prisma.certificates.findUnique({ where: { certificate_id: certificateId } });
  },

  async listByInstitution(institutionId, { limit = 20, offset = 0 } = {}) {
    return prisma.certificates.findMany({
      where: { institution_id: institutionId },
      orderBy: [{ issued_at: "desc" }, { created_at: "desc" }],
      take: limit,
      skip: offset,
    });
  },

  async countByInstitution(institutionId) {
    return prisma.certificates.count({ where: { institution_id: institutionId } });
  },

  async countAll() {
    return prisma.certificates.count();
  },

  // Statistik harian. left(issued_at,10) = padanan Postgres dari substr(.,1,10) sqlite.
  // ::int agar COUNT (bigint) dikembalikan sebagai number (bukan BigInt).
  async issuedDaily(days = 30) {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    return prisma.$queryRaw`
      SELECT left(issued_at, 10) AS day, COUNT(*)::int AS count
      FROM certificates
      WHERE issued_at IS NOT NULL AND left(issued_at, 10) >= ${cutoff}
      GROUP BY day
      ORDER BY day ASC`;
  },
});
