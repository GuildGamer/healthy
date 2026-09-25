-- A group can now be a walking contest, not only a push-up one. Adding values
-- is forward-only: every existing match stays `pushups` and every existing
-- attempt stays `in_app_pose`, which is what those rows already meant.
ALTER TYPE "MatchMetric" ADD VALUE IF NOT EXISTS 'walk';

-- Walk attempts arrive from the walk session rather than the pose camera. The
-- source is checked against the match's metric on write, so this value is what
-- makes "a walk logged into a push-up contest" rejectable rather than silent.
ALTER TYPE "MatchAttemptSource" ADD VALUE IF NOT EXISTS 'in_app_walk';
