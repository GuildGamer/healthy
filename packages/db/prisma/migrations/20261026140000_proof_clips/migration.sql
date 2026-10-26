-- CreateEnum
CREATE TYPE "ProofClipStatus" AS ENUM ('reserved', 'recorded', 'ready', 'expired', 'removed');

-- CreateEnum
CREATE TYPE "ProofClipReportReason" AS ENUM ('inappropriate', 'spam', 'harassment', 'other');

-- CreateTable
CREATE TABLE "proof_clips" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "metric" "DeviceMetric" NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "durationSeconds" INTEGER,
    "userChallengeId" TEXT,
    "matchId" TEXT,
    "matchAttemptId" TEXT,
    "status" "ProofClipStatus" NOT NULL DEFAULT 'reserved',
    "sha256" TEXT,
    "byteSize" INTEGER,
    "videoKey" TEXT,
    "posterKey" TEXT,
    "sharedAt" TIMESTAMP(3),
    "lastViewedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedAt" TIMESTAMP(3),
    "attested" BOOLEAN NOT NULL DEFAULT false,
    "skeletonTrack" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proof_clips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proof_clip_reports" (
    "id" TEXT NOT NULL,
    "clipId" TEXT NOT NULL,
    "reporterUserId" TEXT NOT NULL,
    "reason" "ProofClipReportReason" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proof_clip_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_blocks" (
    "id" TEXT NOT NULL,
    "blockerUserId" TEXT NOT NULL,
    "blockedUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "proof_clips_code_key" ON "proof_clips"("code");

-- CreateIndex
CREATE INDEX "proof_clips_status_expiresAt_idx" ON "proof_clips"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "proof_clips_matchId_userId_idx" ON "proof_clips"("matchId", "userId");

-- CreateIndex
CREATE INDEX "proof_clips_userId_createdAt_idx" ON "proof_clips"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "proof_clip_reports_clipId_idx" ON "proof_clip_reports"("clipId");

-- CreateIndex
CREATE UNIQUE INDEX "proof_clip_reports_clipId_reporterUserId_key" ON "proof_clip_reports"("clipId", "reporterUserId");

-- CreateIndex
CREATE INDEX "user_blocks_blockedUserId_idx" ON "user_blocks"("blockedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "user_blocks_blockerUserId_blockedUserId_key" ON "user_blocks"("blockerUserId", "blockedUserId");

-- AddForeignKey
ALTER TABLE "proof_clips" ADD CONSTRAINT "proof_clips_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proof_clips" ADD CONSTRAINT "proof_clips_userChallengeId_fkey" FOREIGN KEY ("userChallengeId") REFERENCES "user_challenges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proof_clips" ADD CONSTRAINT "proof_clips_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proof_clips" ADD CONSTRAINT "proof_clips_matchAttemptId_fkey" FOREIGN KEY ("matchAttemptId") REFERENCES "match_attempts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proof_clip_reports" ADD CONSTRAINT "proof_clip_reports_clipId_fkey" FOREIGN KEY ("clipId") REFERENCES "proof_clips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proof_clip_reports" ADD CONSTRAINT "proof_clip_reports_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blockerUserId_fkey" FOREIGN KEY ("blockerUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blockedUserId_fkey" FOREIGN KEY ("blockedUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
