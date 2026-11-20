-- Keep existing push-up members on 20 before the catalog default drops to 5.
UPDATE "challenge_enrollments" AS ce
SET "targetCount" = 20
FROM "challenges" AS c
WHERE c.id = ce."challengeId"
  AND c.slug = 'twenty-push-ups'
  AND ce."targetCount" IS NULL;

UPDATE "challenges"
SET "targetCount" = 5,
    "title" = 'Do 5 push-ups'
WHERE "slug" = 'twenty-push-ups';
