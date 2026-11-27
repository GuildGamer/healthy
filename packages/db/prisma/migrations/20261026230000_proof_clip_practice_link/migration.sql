-- AlterTable
ALTER TABLE "proof_clips" ADD COLUMN "deviceActivityLogId" TEXT;

-- CreateIndex
CREATE INDEX "proof_clips_userChallengeId_idx" ON "proof_clips"("userChallengeId");

-- CreateIndex
CREATE INDEX "proof_clips_deviceActivityLogId_idx" ON "proof_clips"("deviceActivityLogId");

-- AddForeignKey
ALTER TABLE "proof_clips" ADD CONSTRAINT "proof_clips_deviceActivityLogId_fkey" FOREIGN KEY ("deviceActivityLogId") REFERENCES "device_activity_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
