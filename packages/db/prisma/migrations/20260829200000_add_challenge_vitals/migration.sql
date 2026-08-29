-- CreateEnum
CREATE TYPE "ChallengeCompletionKind" AS ENUM ('check_in', 'vitals_bp');

-- AlterTable
ALTER TABLE "challenges" ADD COLUMN "completionKind" "ChallengeCompletionKind" NOT NULL DEFAULT 'check_in';
ALTER TABLE "challenges" ADD COLUMN "instruction" TEXT NOT NULL DEFAULT '';

-- The designed blood-pressure form is the completion UI for this catalog row.
UPDATE "challenges"
SET
  "completionKind" = 'vitals_bp',
  "instruction" = 'Sit still for a minute, then measure and log your systolic and diastolic reading.'
WHERE "slug" = 'check-blood-pressure';

-- CreateTable
CREATE TABLE "vital_readings" (
    "id" TEXT NOT NULL,
    "userChallengeId" TEXT NOT NULL,
    "systolic" INTEGER NOT NULL,
    "diastolic" INTEGER NOT NULL,
    "pulse" INTEGER,
    "notes" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vital_readings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vital_readings_userChallengeId_key" ON "vital_readings"("userChallengeId");

-- AddForeignKey
ALTER TABLE "vital_readings" ADD CONSTRAINT "vital_readings_userChallengeId_fkey" FOREIGN KEY ("userChallengeId") REFERENCES "user_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;
