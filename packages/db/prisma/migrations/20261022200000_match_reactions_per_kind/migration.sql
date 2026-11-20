-- One cheer and one nudge per pair per contest day, rather than one tap of either.
DROP INDEX "match_reactions_matchId_fromUserId_toUserId_dayKey_key";

CREATE UNIQUE INDEX "match_reactions_matchId_fromUserId_toUserId_dayKey_kind_key" ON "match_reactions"("matchId", "fromUserId", "toUserId", "dayKey", "kind");
