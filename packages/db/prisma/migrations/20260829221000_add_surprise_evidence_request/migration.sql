-- CreateEnum
CREATE TYPE "UserChallengeCompletionOutcome" AS ENUM ('rewarded', 'penalized');

-- CreateEnum
CREATE TYPE "SurpriseEvidenceStatus" AS ENUM ('pending', 'submitted', 'skipped', 'expired');

-- AlterTable
ALTER TABLE "challenges" ADD COLUMN "surpriseEvidenceChancePercent" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "challenges" ADD COLUMN "surpriseEvidenceWindowSeconds" INTEGER NOT NULL DEFAULT 60;
ALTER TABLE "challenges" ADD COLUMN "surpriseEvidencePenaltyPoints" INTEGER NOT NULL DEFAULT 25;

-- AlterTable
ALTER TABLE "user_challenges" ADD COLUMN "completionOutcome" "UserChallengeCompletionOutcome";

-- CreateTable
CREATE TABLE "surprise_evidence_requests" (
    "id" TEXT NOT NULL,
    "userChallengeId" TEXT NOT NULL,
    "windowSeconds" INTEGER NOT NULL,
    "penaltyPoints" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "SurpriseEvidenceStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "surprise_evidence_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "surprise_evidence_requests_userChallengeId_key" ON "surprise_evidence_requests"("userChallengeId");

-- CreateIndex
CREATE INDEX "surprise_evidence_requests_expiresAt_status_idx" ON "surprise_evidence_requests"("expiresAt", "status");

-- AddForeignKey
ALTER TABLE "surprise_evidence_requests" ADD CONSTRAINT "surprise_evidence_requests_userChallengeId_fkey" FOREIGN KEY ("userChallengeId") REFERENCES "user_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
