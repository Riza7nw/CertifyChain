// src/db/repositories/verifications.pg.repo.js
// Implementasi Postgres (Prisma). Interface identik verifications.repo.js (sqlite), async.
module.exports = (prisma) => ({
  async record({ certificateId, institutionId = null, valid, ip = null }) {
    const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
    await prisma.verifications.create({
      data: {
        certificate_id: certificateId ?? null,
        institution_id: institutionId,
        valid: valid ? 1 : 0,
        ip,
        day,
      },
    });
  },

  async countAll() {
    return prisma.verifications.count();
  },

  async dailyCounts(days = 30, institutionId = null) {
    const cutoff = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    if (institutionId == null) {
      return prisma.$queryRaw`
        SELECT day, COUNT(*)::int AS count, COALESCE(SUM(valid), 0)::int AS valid_count
        FROM verifications
        WHERE day >= ${cutoff}
        GROUP BY day
        ORDER BY day ASC`;
    }
    return prisma.$queryRaw`
      SELECT day, COUNT(*)::int AS count, COALESCE(SUM(valid), 0)::int AS valid_count
      FROM verifications
      WHERE institution_id = ${institutionId} AND day >= ${cutoff}
      GROUP BY day
      ORDER BY day ASC`;
  },
});
