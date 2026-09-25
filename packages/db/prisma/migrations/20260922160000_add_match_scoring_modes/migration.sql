-- Group challenges let the host pick how the contest is won, not just how long
-- it runs. Adding values is forward-only: every existing row stays
-- `best_single`, which is what those contests already meant.
ALTER TYPE "MatchScoringMode" ADD VALUE IF NOT EXISTS 'cumulative_total';
ALTER TYPE "MatchScoringMode" ADD VALUE IF NOT EXISTS 'days_completed';

-- `days_completed` counts the distinct days a member finished any daily
-- occurrence inside the window, so it reads `user_challenges` rather than
-- `match_attempts`. This index serves that scan.
CREATE INDEX IF NOT EXISTS "user_challenges_userId_frequency_status_completedAt_idx"
  ON "user_challenges"("userId", "frequency", "status", "completedAt");
