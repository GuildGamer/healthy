import type { Prisma } from '@product/db';

/** The catalog fields a challenge's mark and title are drawn from. */
export const CHALLENGE_MARK_SELECT = {
  title: true,
  category: true,
  completionKind: true,
  captureKind: true,
  deviceMetric: true,
  targetDurationMinutes: true,
  targetDistanceMeters: true,
  targetCount: true,
  surpriseEvidenceWindowSeconds: true,
} satisfies Prisma.ChallengeSelect;

/** The person's own goals, which override the catalog's on their marks. */
export const ENROLLMENT_GOAL_SELECT = {
  targetCount: true,
  targetDurationMinutes: true,
} satisfies Prisma.ChallengeEnrollmentSelect;
