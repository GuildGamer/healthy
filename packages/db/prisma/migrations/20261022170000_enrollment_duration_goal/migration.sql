-- A person's own minutes goal for a timed challenge, such as a walk.
-- Null keeps the catalogue's "targetDurationMinutes", so existing rows are unchanged.
ALTER TABLE "challenge_enrollments" ADD COLUMN "targetDurationMinutes" INTEGER;
