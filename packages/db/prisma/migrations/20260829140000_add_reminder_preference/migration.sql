-- AlterTable
-- 1140 is 19:00 local, a sensible default for an evening habit nudge.
ALTER TABLE "user_profiles" ADD COLUMN "reminderEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "user_profiles" ADD COLUMN "reminderMinute" INTEGER NOT NULL DEFAULT 1140;
