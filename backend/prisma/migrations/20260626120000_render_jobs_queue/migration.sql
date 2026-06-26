-- CreateTable (Fase C-scale: antrian render async via Postgres)
CREATE TABLE IF NOT EXISTS "render_jobs" (
    "id" SERIAL NOT NULL,
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
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "render_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "render_jobs_certificate_id_key" ON "render_jobs"("certificate_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "render_jobs_status_run_after_idx" ON "render_jobs"("status", "run_after");
