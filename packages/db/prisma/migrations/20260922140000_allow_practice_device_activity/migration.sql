-- Free practice sessions: a push-up set recorded outside any daily occurrence.
-- Dropping NOT NULL is forward-only and leaves every existing challenge row
-- untouched. Postgres permits many nulls under a unique index, so the
-- one-log-per-occurrence guarantee survives for rows that do have an occurrence.
ALTER TABLE "device_activity_logs" ALTER COLUMN "userChallengeId" DROP NOT NULL;

-- Serves the practice feed and today's rep tally.
CREATE INDEX "device_activity_logs_userId_metric_createdAt_idx"
  ON "device_activity_logs"("userId", "metric", "createdAt");
