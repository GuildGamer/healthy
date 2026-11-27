-- Persist best streak so /me does not scan every rewarded daily completion.
ALTER TABLE "user_profiles" ADD COLUMN "bestStreakDays" INTEGER NOT NULL DEFAULT 0;

-- Floor: never below the live streak already stored on the profile.
UPDATE "user_profiles"
SET "bestStreakDays" = "currentStreakDays"
WHERE "currentStreakDays" > "bestStreakDays";
