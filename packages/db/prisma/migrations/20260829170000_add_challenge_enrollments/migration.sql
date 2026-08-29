-- AlterTable
-- Catalog frequency is now only the starting point for an enrolment.
ALTER TABLE "challenges" RENAME COLUMN "frequency" TO "defaultFrequency";
ALTER TABLE "challenges" ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "challenge_enrollments" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "frequency" "ChallengeFrequency" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenge_enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "challenge_enrollments_userId_challengeId_key" ON "challenge_enrollments"("userId", "challengeId");
CREATE INDEX "challenge_enrollments_userId_isActive_idx" ON "challenge_enrollments"("userId", "isActive");

-- AddForeignKey
ALTER TABLE "challenge_enrollments" ADD CONSTRAINT "challenge_enrollments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "challenge_enrollments" ADD CONSTRAINT "challenge_enrollments_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
-- Assignments are no longer daily-only, so the day key becomes a period key:
-- the day for daily, the Monday for weekly, the 1st for monthly. Existing rows
-- were all daily, so the values stay correct under the new meaning.
DROP INDEX "user_challenges_userId_challengeId_dayKey_key";
DROP INDEX "user_challenges_userId_dayKey_idx";

ALTER TABLE "user_challenges" RENAME COLUMN "dayKey" TO "periodKey";
ALTER TABLE "user_challenges" ADD COLUMN "enrollmentId" TEXT;
ALTER TABLE "user_challenges" ADD COLUMN "frequency" "ChallengeFrequency" NOT NULL DEFAULT 'daily';

-- CreateIndex
CREATE UNIQUE INDEX "user_challenges_userId_challengeId_periodKey_key" ON "user_challenges"("userId", "challengeId", "periodKey");
CREATE INDEX "user_challenges_userId_periodKey_idx" ON "user_challenges"("userId", "periodKey");
CREATE INDEX "user_challenges_userId_frequency_status_idx" ON "user_challenges"("userId", "frequency", "status");

-- AddForeignKey
ALTER TABLE "user_challenges" ADD CONSTRAINT "user_challenges_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "challenge_enrollments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
