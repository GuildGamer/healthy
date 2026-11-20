-- AlterTable
ALTER TABLE "challenges" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 100;

-- DropIndex
DROP INDEX "challenges_isActive_category_idx";

-- CreateIndex
CREATE INDEX "challenges_isActive_category_sortOrder_idx" ON "challenges"("isActive", "category", "sortOrder");
