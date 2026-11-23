-- AlterTable
ALTER TABLE "user_challenges" ADD COLUMN "photoKey" TEXT,
ADD COLUMN "photoExpiresAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "user_challenges_photoExpiresAt_idx" ON "user_challenges"("photoExpiresAt");
