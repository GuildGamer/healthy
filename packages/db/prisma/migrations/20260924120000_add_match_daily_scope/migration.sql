-- A streak contest can now be narrowed to its own activity instead of counting
-- whatever daily challenge a member finishes.
CREATE TYPE "MatchDailyScope" AS ENUM ('any_challenge', 'chosen_activity');

-- The default is what every existing streak already counted, so no row changes
-- meaning. Attempt-driven contests never read the column.
ALTER TABLE "matches"
  ADD COLUMN "dailyScope" "MatchDailyScope" NOT NULL DEFAULT 'any_challenge';
