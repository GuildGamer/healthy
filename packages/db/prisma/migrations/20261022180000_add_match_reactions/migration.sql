-- Cheers and nudges: one tap per pair per contest day.
CREATE TYPE "MatchReactionKind" AS ENUM ('cheer', 'nudge');

CREATE TABLE "match_reactions" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "toUserId" TEXT NOT NULL,
    "kind" "MatchReactionKind" NOT NULL,
    "dayKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_reactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "match_reactions_matchId_fromUserId_toUserId_dayKey_key" ON "match_reactions"("matchId", "fromUserId", "toUserId", "dayKey");

CREATE INDEX "match_reactions_matchId_toUserId_dayKey_idx" ON "match_reactions"("matchId", "toUserId", "dayKey");

ALTER TABLE "match_reactions" ADD CONSTRAINT "match_reactions_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "match_reactions" ADD CONSTRAINT "match_reactions_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "match_reactions" ADD CONSTRAINT "match_reactions_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
