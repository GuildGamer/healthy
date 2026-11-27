-- The streak now follows any logged activity, not just daily challenges.
ALTER TABLE "user_profiles" ADD COLUMN "lastActiveDayKey" TEXT;

-- Seed from the signal the streak used until now: the latest rewarded daily completion.
UPDATE "user_profiles" AS profile
SET "lastActiveDayKey" = latest."dayKey"
FROM (
  SELECT "userId", MAX("periodKey") AS "dayKey"
  FROM "user_challenges"
  WHERE "frequency" = 'daily'
    AND "status" = 'completed'
    AND ("completionOutcome" IS NULL OR "completionOutcome" <> 'penalized')
  GROUP BY "userId"
) AS latest
WHERE profile."userId" = latest."userId";
