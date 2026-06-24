// src/db/repositories/verifications.repo.js
// Implementasi node:sqlite (async, interface seragam dengan versi Postgres).
module.exports = (db) => {
  const insertStmt = db.prepare(`
    INSERT INTO verifications (certificate_id, institution_id, valid, ip, day)
    VALUES (@certificate_id, @institution_id, @valid, @ip, @day)
  `);

  return {
    async record({ certificateId, institutionId = null, valid, ip = null }) {
      const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
      insertStmt.run({
        certificate_id: certificateId ?? null,
        institution_id: institutionId,
        valid: valid ? 1 : 0,
        ip,
        day,
      });
    },
    async countAll() {
      return db.prepare(`SELECT COUNT(*) AS n FROM verifications`).get().n;
    },
    // Statistik: verifikasi per hari (N hari terakhir), beserta jumlah yang valid.
    async dailyCounts(days = 30, institutionId = null) {
      if (institutionId == null) {
        return db
          .prepare(
            `SELECT day, COUNT(*) AS count, SUM(valid) AS valid_count
             FROM verifications WHERE day >= date('now', ?)
             GROUP BY day ORDER BY day ASC`
          )
          .all(`-${days} days`);
      }
      return db
        .prepare(
          `SELECT day, COUNT(*) AS count, SUM(valid) AS valid_count
           FROM verifications WHERE institution_id = ? AND day >= date('now', ?)
           GROUP BY day ORDER BY day ASC`
        )
        .all(institutionId, `-${days} days`);
    },
  };
};
