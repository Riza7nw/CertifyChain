-- CreateTable
CREATE TABLE "certificate_templates" (
    "id" SERIAL NOT NULL,
    "organization_id" INTEGER,
    "key" TEXT NOT NULL DEFAULT 'classic',
    "name" TEXT NOT NULL,
    "accent" TEXT,
    "logo_cid" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "certificate_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "certificate_templates_organization_id_idx" ON "certificate_templates"("organization_id");
