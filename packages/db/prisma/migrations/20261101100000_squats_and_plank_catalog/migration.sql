-- Squats and plank lived only in the seed. The earlier camera-exercise
-- backfill assumed they were already on deployed databases and skipped them.
-- Rows match seed.ts; a database that already ran the seed keeps its own.
INSERT INTO "challenges" (
  "id",
  "slug",
  "title",
  "description",
  "category",
  "rewardPoints",
  "defaultFrequency",
  "isDefault",
  "requiresMembership",
  "isActive",
  "completionKind",
  "captureKind",
  "deviceMetric",
  "targetCount",
  "instruction",
  "icon",
  "sortOrder",
  "createdAt",
  "updatedAt"
)
VALUES
  (
    'chl_twenty_squats',
    'twenty-squats',
    'Do 20 squats',
    'Prop your phone, face the camera, and complete your set of squats counted on-device.',
    'general',
    150,
    'daily',
    true,
    false,
    true,
    'check_in',
    'device_session',
    'squats',
    20,
    'Prop your phone facing you so your whole body is in the frame. Start your first squat. Counting begins automatically. Video stays on this device.',
    'arm-flex',
    1,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'chl_sixty_second_plank',
    'sixty-second-plank',
    'Hold a 60-second plank',
    'Prop your phone side-on and hold a plank while the camera times it.',
    'general',
    150,
    'daily',
    true,
    false,
    true,
    'check_in',
    'device_session',
    'plank',
    60,
    'Prop your phone side-on so your whole body is in the frame. Get into a plank; the timer runs while you hold it. Video stays on this device.',
    'arm-flex',
    2,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("slug") DO NOTHING;

-- Existing members who never had a row get the same starter enrolment new
-- accounts receive. A removed challenge already has a row, so it stays off.
WITH new_enrollments AS (
  INSERT INTO "challenge_enrollments" (
    "id",
    "userId",
    "challengeId",
    "frequency",
    "isActive",
    "createdAt",
    "updatedAt"
  )
  SELECT
    gen_random_uuid()::text,
    u."id",
    c."id",
    'daily',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  FROM "user" AS u
  CROSS JOIN "challenges" AS c
  WHERE c."slug" IN ('twenty-squats', 'sixty-second-plank')
    AND NOT EXISTS (
      SELECT 1
      FROM "challenge_enrollments" AS e
      WHERE e."userId" = u."id"
        AND e."challengeId" = c."id"
    )
  RETURNING "id", "userId"
)
INSERT INTO "challenge_reminders" (
  "id",
  "enrollmentId",
  "minuteOfDay",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  e."id",
  COALESCE(p."reminderMinute", 1140),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM new_enrollments AS e
LEFT JOIN "user_profiles" AS p ON p."userId" = e."userId";
