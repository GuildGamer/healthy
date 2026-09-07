-- CreateEnum
CREATE TYPE "MatchMetric" AS ENUM ('pushups');

-- CreateEnum
CREATE TYPE "MatchScoringMode" AS ENUM ('best_single');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('open', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "MatchAttemptSource" AS ENUM ('in_app_pose');

-- CreateTable
CREATE TABLE "matches" (
    "id" TEXT NOT NULL,
    "hostUserId" TEXT NOT NULL,
    "inviteToken" TEXT NOT NULL,
    "metric" "MatchMetric" NOT NULL DEFAULT 'pushups',
    "scoringMode" "MatchScoringMode" NOT NULL DEFAULT 'best_single',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'open',
    "winnerUserId" TEXT,
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_participants" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_attempts" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "durationSeconds" INTEGER NOT NULL,
    "source" "MatchAttemptSource" NOT NULL DEFAULT 'in_app_pose',
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "matches_inviteToken_key" ON "matches"("inviteToken");

-- CreateIndex
CREATE INDEX "matches_hostUserId_createdAt_idx" ON "matches"("hostUserId", "createdAt");

-- CreateIndex
CREATE INDEX "matches_status_endsAt_idx" ON "matches"("status", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "match_participants_matchId_userId_key" ON "match_participants"("matchId", "userId");

-- CreateIndex
CREATE INDEX "match_participants_userId_joinedAt_idx" ON "match_participants"("userId", "joinedAt");

-- CreateIndex
CREATE INDEX "match_attempts_matchId_userId_recordedAt_idx" ON "match_attempts"("matchId", "userId", "recordedAt");

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_hostUserId_fkey" FOREIGN KEY ("hostUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_winnerUserId_fkey" FOREIGN KEY ("winnerUserId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_participants" ADD CONSTRAINT "match_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_attempts" ADD CONSTRAINT "match_attempts_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_attempts" ADD CONSTRAINT "match_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
