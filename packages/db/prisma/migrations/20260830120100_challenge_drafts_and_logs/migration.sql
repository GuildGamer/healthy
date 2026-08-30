-- AlterTable
ALTER TABLE "user_profiles"
ADD COLUMN "inProgressNudgeEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "inProgressNudgeDelayMinutes" INTEGER NOT NULL DEFAULT 30;

-- AlterTable
ALTER TABLE "user_challenges"
ADD COLUMN "draft" JSONB,
ADD COLUMN "draftUpdatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "challenge_logs" (
    "id" TEXT NOT NULL,
    "userChallengeId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "challenge_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "in_progress_nudge_deliveries" (
    "id" TEXT NOT NULL,
    "userChallengeId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "in_progress_nudge_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "challenge_logs_userChallengeId_key" ON "challenge_logs"("userChallengeId");

-- CreateIndex
CREATE UNIQUE INDEX "in_progress_nudge_deliveries_userChallengeId_key" ON "in_progress_nudge_deliveries"("userChallengeId");

-- AddForeignKey
ALTER TABLE "challenge_logs" ADD CONSTRAINT "challenge_logs_userChallengeId_fkey" FOREIGN KEY ("userChallengeId") REFERENCES "user_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "in_progress_nudge_deliveries" ADD CONSTRAINT "in_progress_nudge_deliveries_userChallengeId_fkey" FOREIGN KEY ("userChallengeId") REFERENCES "user_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Catalog rows that describe a log become real completion kinds.
UPDATE "challenges" SET "completionKind" = 'glucose', "instruction" = 'Record a fasting or mealtime glucose reading in mmol/L.' WHERE "slug" = 'glucose-check';
UPDATE "challenges" SET "completionKind" = 'peak_flow', "instruction" = 'Blow into your peak flow meter three times and log the best reading.' WHERE "slug" = 'peak-flow-reading';
UPDATE "challenges" SET "completionKind" = 'water', "instruction" = 'Log how much water you drank today, in glasses or millilitres.' WHERE "slug" = 'log-water-intake';
UPDATE "challenges" SET "completionKind" = 'carbs', "instruction" = 'Note the carbohydrates in your main meals, as grams or a short description.' WHERE "slug" = 'log-carbohydrates';
