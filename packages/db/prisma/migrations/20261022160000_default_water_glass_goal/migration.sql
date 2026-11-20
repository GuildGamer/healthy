-- A water challenge counts glasses toward a goal kept in "targetCount".
-- Existing rows predate the goal, so they take the default of eight.
UPDATE "challenges" SET "targetCount" = 8 WHERE "completionKind" = 'water' AND "targetCount" IS NULL;
