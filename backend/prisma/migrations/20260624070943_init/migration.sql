-- CreateTable
CREATE TABLE "meta" (
    "key" TEXT NOT NULL,
    "value" TEXT,

    CONSTRAINT "meta_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "institutions" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "metadata_cid" TEXT,
    "admin_address" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "tx_hash" TEXT,
    "block_number" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "institutions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "certificate_id" TEXT NOT NULL,
    "institution_id" INTEGER NOT NULL,
    "recipient_name" TEXT,
    "file_cid" TEXT,
    "data_hash" TEXT,
    "issued_by" TEXT,
    "status" TEXT NOT NULL DEFAULT 'valid',
    "tx_hash" TEXT,
    "block_number" INTEGER,
    "issued_at" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("certificate_id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" SERIAL NOT NULL,
    "certificate_id" TEXT,
    "institution_id" INTEGER,
    "valid" INTEGER,
    "ip" TEXT,
    "day" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "certificates_institution_id_idx" ON "certificates"("institution_id");

-- CreateIndex
CREATE INDEX "certificates_issued_at_idx" ON "certificates"("issued_at");

-- CreateIndex
CREATE INDEX "verifications_day_idx" ON "verifications"("day");

-- CreateIndex
CREATE INDEX "verifications_institution_id_idx" ON "verifications"("institution_id");
