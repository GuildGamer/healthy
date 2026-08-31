-- CreateEnum
CREATE TYPE "ChallengeCaptureKind" AS ENUM ('self_report', 'structured_log', 'photo', 'device_sample', 'device_session');

-- CreateEnum
CREATE TYPE "DeviceMetric" AS ENUM ('walk', 'run', 'cycle', 'steps', 'sleep', 'weight', 'heart_rate');

-- CreateEnum
CREATE TYPE "DeviceActivitySource" AS ENUM ('healthkit', 'health_connect', 'in_app_gps', 'pedometer', 'manual');

-- CreateEnum
CREATE TYPE "HealthLinkStatus" AS ENUM ('unknown', 'connected', 'denied');

-- AlterTable
ALTER TABLE "user_profiles"
ADD COLUMN "healthLinkStatus" "HealthLinkStatus" NOT NULL DEFAULT 'unknown';

-- AlterTable
ALTER TABLE "challenges"
ADD COLUMN "captureKind" "ChallengeCaptureKind" NOT NULL DEFAULT 'self_report',
ADD COLUMN "deviceMetric" "DeviceMetric",
ADD COLUMN "targetDurationMinutes" INTEGER,
ADD COLUMN "targetDistanceMeters" INTEGER,
ADD COLUMN "targetCount" INTEGER;

-- CreateTable
CREATE TABLE "device_activity_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userChallengeId" TEXT NOT NULL,
    "source" "DeviceActivitySource" NOT NULL,
    "metric" "DeviceMetric" NOT NULL,
    "durationSeconds" INTEGER,
    "distanceMeters" INTEGER,
    "count" INTEGER,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "device_activity_logs_userChallengeId_key" ON "device_activity_logs"("userChallengeId");

-- CreateIndex
CREATE UNIQUE INDEX "device_activity_logs_userId_externalId_key" ON "device_activity_logs"("userId", "externalId");

-- CreateIndex
CREATE INDEX "device_activity_logs_userId_metric_idx" ON "device_activity_logs"("userId", "metric");

-- AddForeignKey
ALTER TABLE "device_activity_logs" ADD CONSTRAINT "device_activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_activity_logs" ADD CONSTRAINT "device_activity_logs_userChallengeId_fkey" FOREIGN KEY ("userChallengeId") REFERENCES "user_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing catalog: derive capture from completion kind, then mark movement rows.
UPDATE "challenges" SET "captureKind" = 'structured_log'
WHERE "completionKind" IN ('vitals_bp', 'glucose', 'peak_flow', 'water', 'carbs');

UPDATE "challenges" SET "captureKind" = 'photo'
WHERE "completionKind" = 'evidence_photo';

UPDATE "challenges"
SET
  "captureKind" = 'device_session',
  "deviceMetric" = 'walk',
  "targetDurationMinutes" = 10,
  "instruction" = 'Walk for at least ten minutes. Your phone can record the route, or confirm if you already did.',
  "surpriseEvidenceChancePercent" = 0
WHERE "slug" = 'ten-minute-walk';
