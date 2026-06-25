-- AlterTable
ALTER TABLE "certificates" ADD COLUMN     "artifact_type" TEXT NOT NULL DEFAULT 'uploaded',
ADD COLUMN     "pdf_hash" TEXT,
ADD COLUMN     "render_status" TEXT NOT NULL DEFAULT 'done',
ADD COLUMN     "signed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "template_key" TEXT;
