import type { Prisma } from '@product/db';

/**
 * Removing a challenge deactivates its enrolment but leaves the row for the
 * open period behind. That row stays visible only once completed, so the
 * day keeps the points it already earned.
 */
export const VISIBLE_OCCURRENCE_FILTER = {
  OR: [{ enrollment: { isActive: true } }, { status: 'completed' }],
} satisfies Prisma.UserChallengeWhereInput;
