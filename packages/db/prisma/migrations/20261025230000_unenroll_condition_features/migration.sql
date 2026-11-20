-- Drop existing enrollments for challenges the fitness pivot already hid.
-- Catalog isActive alone was not enough: users stayed "enrolled" and Today
-- could keep stale occurrences until the access filter landed.
UPDATE "challenge_enrollments" AS e
SET "isActive" = false
FROM "challenges" AS c
WHERE e."challengeId" = c.id
  AND e."isActive" = true
  AND (
    c."isActive" = false
    OR c."category" IN ('hypertension', 'diabetes', 'asthma')
    OR c."slug" IN (
      'log-water-intake',
      'sleep-log',
      'weekly-weigh-in',
      'medication-refill'
    )
  );

-- Remove open board rows for those challenges so they leave Today immediately.
DELETE FROM "user_challenges" AS uc
USING "challenges" AS c
WHERE uc."challengeId" = c.id
  AND uc."status" IN ('pending', 'in_progress', 'awaiting_evidence')
  AND (
    c."isActive" = false
    OR c."category" IN ('hypertension', 'diabetes', 'asthma')
    OR c."slug" IN (
      'log-water-intake',
      'sleep-log',
      'weekly-weigh-in',
      'medication-refill'
    )
  );
