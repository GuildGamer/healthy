-- AlterEnum
-- `BEFORE 'completed'` keeps the stored sort order aligned with the schema.
ALTER TYPE "UserChallengeStatus" ADD VALUE 'in_progress' BEFORE 'completed';

-- AlterTable
ALTER TABLE "user_challenges" ADD COLUMN "startedAt" TIMESTAMP(3);
