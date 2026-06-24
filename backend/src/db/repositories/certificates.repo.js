// src/db/repositories/certificates.repo.js
module.exports = (db) => {
  // Upsert: aman dipanggil oleh write-path (API, lengkap dengan recipient_name)
  // maupun indexer (dari event, tanpa recipient_name -> COALESCE menjaga nilai lama).
  const upsertStmt = db.prepare(`
    INSERT INTO certificates
      (certificate_id, institution_id, recipient_name, file_cid, data_hash, issued_by, status, tx_hash, block_number, issued_at)
    VALUES
      (@certificate_id, @institution_id, @recipient_name, @file_cid, @data_hash, @issued_by, @status, @tx_hash, @block_number, @issued_at)
    ON CONFLICT(certificate_id) DO UPDATE SET
      recipient_name = COALESCE(excluded.recipient_name, certificates.recipient_name),
      file_cid       = COALESCE(excluded.file_cid, certificates.file_cid),
      data_hash      = COALESCE(excluded.data_hash, certificates.data_hash),
      issued_by      = COALESCE(excluded.issued_by, certificates.issued_by),
      status         = COALESCE(excluded.status, certificates.status),
      tx_hash        = COALESCE(excluded.tx_hash, certificates.tx_hash),
      block_number   = COALESCE(excluded.block_number, certificates.block_number),
      issued_at      = COALESCE(excluded.issued_at, certificates.issued_at)
  `);

  return {
    async upsert(c) {
      upsertStmt.run({
        certificate_id: c.certificateId,
        institution_id: c.institutionId,
        recipient_name: c.recipientName ?? null,
        file_cid: c.fileCid ?? null,
        data_hash: c.dataHash ?? null,
        issued_by: c.issuedBy ?? null,
        status: c.status ?? null,
        tx_hash: c.txHash ?? null,
        block_number: c.blockNumber ?? null,
        issued_at: c.issuedAt ?? null,
      });
    },
    async setStatus(certificateId, status) {
      db.prepare(`UPDATE certificates SET status = ? WHERE certificate_id = ?`).run(status, certificateId);
    },
    async get(certificateId) {
      return db.prepare(`SELECT * FROM certificates WHERE certificate_id = ?`).get(certificateId) || null;
    },
    // Dashboard institusi: daftar sertifikat (paginasi).
    async listByInstitution(institutionId, { limit = 20, offset = 0 } = {}) {
      return db
        .prepare(
          `SELECT * FROM certificates WHERE institution_id = ?
           ORDER BY issued_at DESC, created_at DESC LIMIT ? OFFSET ?`
        )
        .all(institutionId, limit, offset);
    },
    async countByInstitution(institutionId) {
      return db
        .prepare(`SELECT COUNT(*) AS n FROM certificates WHERE institution_id = ?`)
        .get(institutionId).n;
    },
    async countAll() {
      return db.prepare(`SELECT COUNT(*) AS n FROM certificates`).get().n;
    },
    // Statistik: jumlah penerbitan per hari (N hari terakhir).
    async issuedDaily(days = 30) {
      return db
        .prepare(
          `SELECT substr(issued_at, 1, 10) AS day, COUNT(*) AS count
           FROM certificates
           WHERE issued_at IS NOT NULL AND substr(issued_at,1,10) >= date('now', ?)
           GROUP BY day ORDER BY day ASC`
        )
        .all(`-${days} days`);
    },
  };
};
