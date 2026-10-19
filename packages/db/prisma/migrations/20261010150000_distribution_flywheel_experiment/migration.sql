-- AlterTable
ALTER TABLE "matches" ADD COLUMN "parentMatchId" TEXT;
ALTER TABLE "matches" ADD COLUMN "sourceUserChallengeId" TEXT;
ALTER TABLE "matches" ADD COLUMN "experimentId" TEXT;
ALTER TABLE "matches" ADD COLUMN "experimentVariantKey" TEXT;
ALTER TABLE "matches" ADD COLUMN "firstOpenedAt" TIMESTAMP(3);

-- CreateEnum
CREATE TYPE "ExperimentStatus" AS ENUM ('draft', 'running', 'ended');

-- CreateTable
CREATE TABLE "experiments" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" "ExperimentStatus" NOT NULL DEFAULT 'draft',
    "primaryMetric" TEXT NOT NULL,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experiments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiment_variants" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "configuration" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experiment_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiment_assignments" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "experiment_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT,
    "anonymousId" TEXT,
    "properties" JSONB NOT NULL DEFAULT '{}',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "experiments_key_key" ON "experiments"("key");

-- CreateIndex
CREATE INDEX "experiment_variants_experimentId_idx" ON "experiment_variants"("experimentId");

-- CreateIndex
CREATE UNIQUE INDEX "experiment_variants_experimentId_key_key" ON "experiment_variants"("experimentId", "key");

-- CreateIndex
CREATE INDEX "experiment_assignments_userId_idx" ON "experiment_assignments"("userId");

-- CreateIndex
CREATE INDEX "experiment_assignments_variantId_idx" ON "experiment_assignments"("variantId");

-- CreateIndex
CREATE UNIQUE INDEX "experiment_assignments_experimentId_userId_key" ON "experiment_assignments"("experimentId", "userId");

-- CreateIndex
CREATE INDEX "analytics_events_name_occurredAt_idx" ON "analytics_events"("name", "occurredAt");

-- CreateIndex
CREATE INDEX "analytics_events_userId_occurredAt_idx" ON "analytics_events"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "analytics_events_anonymousId_occurredAt_idx" ON "analytics_events"("anonymousId", "occurredAt");

-- CreateIndex
CREATE INDEX "matches_parentMatchId_idx" ON "matches"("parentMatchId");

-- CreateIndex
CREATE INDEX "matches_experimentId_experimentVariantKey_idx" ON "matches"("experimentId", "experimentVariantKey");

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_parentMatchId_fkey" FOREIGN KEY ("parentMatchId") REFERENCES "matches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_sourceUserChallengeId_fkey" FOREIGN KEY ("sourceUserChallengeId") REFERENCES "user_challenges"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "matches" ADD CONSTRAINT "matches_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "experiments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiment_variants" ADD CONSTRAINT "experiment_variants_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "experiments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiment_assignments" ADD CONSTRAINT "experiment_assignments_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "experiments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiment_assignments" ADD CONSTRAINT "experiment_assignments_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "experiment_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiment_assignments" ADD CONSTRAINT "experiment_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Seed Challenge Referral v1 (running, 50/50). Fixed ids so environments stay aligned.
INSERT INTO "experiments" ("id", "key", "name", "description", "status", "primaryMetric", "startAt", "createdAt", "updatedAt")
VALUES (
  'exp_challenge_referral_v1',
  'challenge_referral_v1',
  'Challenge Referral v1',
  'Push-up completion → challenge-a-friend continuation vs existing share experience.',
  'running',
  'activated_friend_rate',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Stage 1 is qualitative: 100% treatment so every completion shows the
-- challenge-a-friend continuation. Restore 50/50 weights for Stage 2.
INSERT INTO "experiment_variants" ("id", "experimentId", "key", "name", "weight", "configuration", "createdAt", "updatedAt")
VALUES
  (
    'expvar_challenge_referral_v1_control',
    'exp_challenge_referral_v1',
    'control',
    'Control',
    0,
    '{"completionCta":"share_only"}',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'expvar_challenge_referral_v1_treatment',
    'exp_challenge_referral_v1',
    'treatment',
    'Treatment',
    1,
    '{"completionCta":"challenge_friend_primary","framing":"competition"}',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );
