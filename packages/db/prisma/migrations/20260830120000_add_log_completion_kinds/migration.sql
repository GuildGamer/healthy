-- AlterEnum
-- Split from later statements: Postgres will not let a value added to an
-- enum be used by later statements in the same transaction.
ALTER TYPE "ChallengeCompletionKind" ADD VALUE 'glucose';
ALTER TYPE "ChallengeCompletionKind" ADD VALUE 'peak_flow';
ALTER TYPE "ChallengeCompletionKind" ADD VALUE 'water';
ALTER TYPE "ChallengeCompletionKind" ADD VALUE 'carbs';
