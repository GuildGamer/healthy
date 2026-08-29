-- AlterEnum
-- Split from the enrolment migration: Postgres will not let a value added to an
-- enum be used by later statements in the same transaction.
ALTER TYPE "ChallengeFrequency" ADD VALUE 'weekly';
ALTER TYPE "ChallengeFrequency" ADD VALUE 'monthly';
