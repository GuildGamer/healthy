-- Split from later statements: Postgres will not let a value added to an
-- enum be used by later statements in the same transaction.
ALTER TYPE "UserChallengeStatus" ADD VALUE 'awaiting_evidence';
ALTER TYPE "NotificationKind" ADD VALUE 'evidence';
ALTER TYPE "NotificationKind" ADD VALUE 'penalty';
