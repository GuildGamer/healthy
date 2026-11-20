-- Display name only. The plan slug stays so existing subscriptions keep their key.
UPDATE "membership_plans"
SET "name" = 'Beatset',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'healthy-starter'
  AND "name" = 'Healthy';
