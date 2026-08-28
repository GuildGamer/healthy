-- AlterTable
ALTER TABLE "user_profiles" ADD COLUMN "pointsBalance" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "user_profiles" ADD COLUMN "currentStreakDays" INTEGER NOT NULL DEFAULT 0;

-- CreateEnum
CREATE TYPE "ChallengeFrequency" AS ENUM ('daily');
CREATE TYPE "UserChallengeStatus" AS ENUM ('pending', 'completed');

-- CreateTable
CREATE TABLE "challenges" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "HealthCategory" NOT NULL,
    "rewardPoints" INTEGER NOT NULL,
    "frequency" "ChallengeFrequency" NOT NULL DEFAULT 'daily',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenges_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "challenges_slug_key" ON "challenges"("slug");
CREATE INDEX "challenges_isActive_category_idx" ON "challenges"("isActive", "category");

CREATE TABLE "user_challenges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "status" "UserChallengeStatus" NOT NULL DEFAULT 'pending',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_challenges_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_challenges_userId_challengeId_dayKey_key" ON "user_challenges"("userId", "challengeId", "dayKey");
CREATE INDEX "user_challenges_userId_dayKey_idx" ON "user_challenges"("userId", "dayKey");

ALTER TABLE "user_challenges" ADD CONSTRAINT "user_challenges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_challenges" ADD CONSTRAINT "user_challenges_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "point_ledger_entries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "userChallengeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "point_ledger_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "point_ledger_entries_idempotencyKey_key" ON "point_ledger_entries"("idempotencyKey");
CREATE INDEX "point_ledger_entries_userId_createdAt_idx" ON "point_ledger_entries"("userId", "createdAt");

ALTER TABLE "point_ledger_entries" ADD CONSTRAINT "point_ledger_entries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "point_ledger_entries" ADD CONSTRAINT "point_ledger_entries_userChallengeId_fkey" FOREIGN KEY ("userChallengeId") REFERENCES "user_challenges"("id") ON DELETE SET NULL ON UPDATE CASCADE;
