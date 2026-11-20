import type { CatalogChallenge, ChallengeCapture, ChallengeCatalogOutput } from '@product/client';

const NO_TARGET = { durationMinutes: null, distanceMeters: null, count: null };

export const SELF_REPORT: ChallengeCapture = {
  kind: 'self_report',
  metric: null,
  target: NO_TARGET,
};
export const WALK_TEN: ChallengeCapture = {
  kind: 'device_session',
  metric: 'walk',
  target: { ...NO_TARGET, durationMinutes: 10 },
};
export const PUSHUPS_TWENTY: ChallengeCapture = {
  kind: 'device_session',
  metric: 'pushups',
  target: { ...NO_TARGET, count: 20 },
};

export function catalogChallenge(
  overrides: Partial<CatalogChallenge> & { challengeId: string },
): CatalogChallenge {
  return {
    slug: overrides.challengeId,
    title: `Challenge ${overrides.challengeId}`,
    description: 'Something kind to do.',
    category: 'general',
    rewardPoints: 150,
    sortOrder: 100,
    frequency: 'daily',
    completionKind: 'check_in',
    instruction: 'Do it once.',
    icon: 'leaf',
    isEnrolled: false,
    requiresMembership: false,
    isLocked: false,
    reminders: [],
    capture: SELF_REPORT,
    ...overrides,
  };
}

export function catalogOutput(
  challenges: CatalogChallenge[],
  overrides: Partial<ChallengeCatalogOutput> = {},
): ChallengeCatalogOutput {
  return {
    challenges,
    enrolledCount: challenges.filter((challenge) => challenge.isEnrolled).length,
    hasMembership: false,
    maxRemindersPerChallenge: 1,
    ...overrides,
  };
}
