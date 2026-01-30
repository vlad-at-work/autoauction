-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'open',
ADD COLUMN     "notes" TEXT;

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");
