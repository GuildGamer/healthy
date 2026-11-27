-- Idempotent contest sets: clientAttemptId unique per match member.
ALTER TABLE "match_attempts" ADD COLUMN "clientAttemptId" TEXT;

UPDATE "match_attempts"
SET "clientAttemptId" = 'legacy:' || "id"
WHERE "clientAttemptId" IS NULL;

ALTER TABLE "match_attempts" ALTER COLUMN "clientAttemptId" SET NOT NULL;

CREATE UNIQUE INDEX "match_attempts_matchId_userId_clientAttemptId_key" ON "match_attempts"("matchId", "userId", "clientAttemptId");
