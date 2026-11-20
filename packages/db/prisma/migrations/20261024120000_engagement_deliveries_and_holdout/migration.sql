-- First-party push delivery log for engagement measurement.
CREATE TABLE "engagement_deliveries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "situation" TEXT,
    "copyVersion" TEXT NOT NULL DEFAULT 'v1',
    "experimentKey" TEXT,
    "variantKey" TEXT,
    "leadChallengeId" TEXT,
    "notificationId" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "openedAt" TIMESTAMP(3),

    CONSTRAINT "engagement_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "engagement_deliveries_userId_sentAt_idx" ON "engagement_deliveries"("userId", "sentAt");
CREATE INDEX "engagement_deliveries_source_sentAt_idx" ON "engagement_deliveries"("source", "sentAt");
CREATE INDEX "engagement_deliveries_experimentKey_variantKey_sentAt_idx" ON "engagement_deliveries"("experimentKey", "variantKey", "sentAt");

ALTER TABLE "engagement_deliveries" ADD CONSTRAINT "engagement_deliveries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Permanent 10% holdout for engagement behaviour changes (Phase 4+).
INSERT INTO "experiments" ("id", "key", "name", "description", "status", "primaryMetric", "startAt", "createdAt", "updatedAt")
VALUES (
  'exp_engagement_holdout_v1',
  'engagement_holdout_v1',
  'Engagement holdout',
  'Permanent baseline: holdout keeps current notification behaviour while treatment gets Phases 4–6 changes.',
  'running'::"ExperimentStatus",
  'completion_rate',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("key") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "status" = EXCLUDED."status",
  "primaryMetric" = EXCLUDED."primaryMetric",
  "updatedAt" = CURRENT_TIMESTAMP;

INSERT INTO "experiment_variants" ("id", "experimentId", "key", "name", "weight", "configuration", "createdAt", "updatedAt")
VALUES
  (
    'var_engagement_holdout_v1_holdout',
    'exp_engagement_holdout_v1',
    'holdout',
    'Holdout',
    1,
    '{}',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'var_engagement_holdout_v1_treatment',
    'exp_engagement_holdout_v1',
    'treatment',
    'Treatment',
    9,
    '{}',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
ON CONFLICT ("experimentId", "key") DO UPDATE SET
  "name" = EXCLUDED."name",
  "weight" = EXCLUDED."weight",
  "updatedAt" = CURRENT_TIMESTAMP;
