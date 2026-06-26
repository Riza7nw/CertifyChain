// src/db/renderJobs.repo.js
// Repository antrian render (Fase C-scale). POSTGRES-ONLY: diakses via raw SQL
// karena klaim job memakai FOR UPDATE SKIP LOCKED (atomic, aman multi-worker) yang
// tak terekspos lewat Prisma model API. Tidak bergantung pada client ter-generate.

const prisma = require("./prismaClient");

// Jaring pengaman bila user belum menjalankan `prisma migrate deploy` (idempotent).
async function ensureTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "render_jobs" (
      "id" SERIAL PRIMARY KEY,
      "certificate_id" TEXT NOT NULL,
      "organization_id" INTEGER,
      "institution_id" INTEGER NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'queued',
      "payload" JSONB NOT NULL,
      "result" JSONB,
      "attempts" INTEGER NOT NULL DEFAULT 0,
      "max_attempts" INTEGER NOT NULL DEFAULT 3,
      "last_error" TEXT,
      "run_after" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "locked_at" TIMESTAMP(3),
      "locked_by" TEXT,
      "tx_hash" TEXT,
      "file_cid" TEXT,
      "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
  await prisma.$executeRawUnsafe(
    `CREATE UNIQUE INDEX IF NOT EXISTS "render_jobs_certificate_id_key" ON "render_jobs"("certificate_id")`
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "render_jobs_status_run_after_idx" ON "render_jobs"("status", "run_after")`
  );
}

async function enqueue({ certificateId, organizationId = null, institutionId, payload, maxAttempts = 3 }) {
  const rows = await prisma.$queryRawUnsafe(
    `INSERT INTO "render_jobs" (certificate_id, organization_id, institution_id, payload, max_attempts)
     VALUES ($1, $2, $3, $4::jsonb, $5) RETURNING *`,
    certificateId,
    organizationId,
    institutionId,
    JSON.stringify(payload),
    maxAttempts
  );
  return rows[0];
}

/**
 * Klaim 1 job berikutnya secara atomik (aman dijalankan banyak worker paralel):
 *  - job 'queued' yang run_after <= sekarang, ATAU
 *  - job 'processing' yang macet (locked_at terlalu lama -> worker mati di tengah).
 * FOR UPDATE SKIP LOCKED -> worker lain melewati baris yang sedang diklaim.
 */
async function claimNext(workerId, { stuckMs = 120000 } = {}) {
  const rows = await prisma.$queryRawUnsafe(
    `UPDATE "render_jobs"
        SET status='processing', locked_at=now(), locked_by=$1, attempts=attempts+1, updated_at=now()
      WHERE id = (
        SELECT id FROM "render_jobs"
         WHERE (status='queued' AND run_after <= now())
            OR (status='processing' AND locked_at < now() - ($2 || ' milliseconds')::interval)
         ORDER BY run_after ASC, id ASC
         FOR UPDATE SKIP LOCKED
         LIMIT 1
      )
      RETURNING *`,
    workerId,
    String(stuckMs)
  );
  return rows[0] || null;
}

async function markDone(id, { txHash = null, fileCid = null, result = null } = {}) {
  await prisma.$executeRawUnsafe(
    `UPDATE "render_jobs"
        SET status='done', tx_hash=$2, file_cid=$3, result=$4::jsonb,
            last_error=NULL, locked_at=NULL, locked_by=NULL, updated_at=now()
      WHERE id=$1`,
    Number(id),
    txHash,
    fileCid,
    result ? JSON.stringify(result) : null
  );
}

/**
 * Tandai gagal: bila masih ada sisa percobaan -> requeue dengan backoff; bila habis
 * -> failed permanen. (attempts sudah di-increment saat claimNext.)
 */
async function markFailed(id, errorMsg, { maxAttempts = 3, backoffMs = 15000 } = {}) {
  const job = await getById(id);
  const attempts = job?.attempts ?? maxAttempts;
  if (attempts < maxAttempts) {
    await prisma.$executeRawUnsafe(
      `UPDATE "render_jobs"
          SET status='queued', run_after = now() + ($2 || ' milliseconds')::interval,
              last_error=$3, locked_at=NULL, locked_by=NULL, updated_at=now()
        WHERE id=$1`,
      Number(id),
      String(backoffMs),
      errorMsg
    );
    return "requeued";
  }
  await prisma.$executeRawUnsafe(
    `UPDATE "render_jobs"
        SET status='failed', last_error=$2, locked_at=NULL, locked_by=NULL, updated_at=now()
      WHERE id=$1`,
    Number(id),
    errorMsg
  );
  return "failed";
}

async function getById(id) {
  const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "render_jobs" WHERE id=$1`, Number(id));
  return rows[0] || null;
}

async function getByCertId(certId) {
  const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "render_jobs" WHERE certificate_id=$1`, certId);
  return rows[0] || null;
}

// Statistik ringkas untuk observasi (mis. health/admin).
async function countsByStatus() {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT status, COUNT(*)::int AS n FROM "render_jobs" GROUP BY status`
  );
  return Object.fromEntries(rows.map((r) => [r.status, r.n]));
}

module.exports = {
  ensureTable,
  enqueue,
  claimNext,
  markDone,
  markFailed,
  getById,
  getByCertId,
  countsByStatus,
};
