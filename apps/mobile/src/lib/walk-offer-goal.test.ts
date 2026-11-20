import type { TodayChallenge } from '@product/client';
import { openWalkOfferGoal } from '@/lib/walk-offer-goal';

function walkChallenge(
  overrides: Partial<TodayChallenge> & Pick<TodayChallenge, 'id' | 'challengeId'>,
): TodayChallenge {
  return {
    title: 'Walk',
    description: '',
    category: 'general',
    rewardPoints: 20,
    sortOrder: 1,
    frequency: 'daily',
    periodKey: '2026-10-30',
    status: 'pending',
    completionKind: 'check_in',
    instruction: 'Walk',
    icon: 'walk',
    progress: { filled: 0, required: 1 },
    draft: null,
    evidenceRequest: null,
    capture: {
      kind: 'device_session',
      metric: 'walk',
      target: { durationMinutes: 10, distanceMeters: null, count: null },
    },
    ...overrides,
  } as TodayChallenge;
}

describe('openWalkOfferGoal', () => {
  it('picks the open daily walk with a minute goal', () => {
    expect(
      openWalkOfferGoal(
        [walkChallenge({ id: 'uc-walk', challengeId: 'c-walk' })],
        '2026-10-30',
      ),
    ).toEqual({
      challengeId: 'c-walk',
      userChallengeId: 'uc-walk',
      targetDurationMinutes: 10,
      dayKey: '2026-10-30',
    });
  });

  it('skips completed walks', () => {
    expect(
      openWalkOfferGoal(
        [walkChallenge({ id: 'uc-walk', challengeId: 'c-walk', status: 'completed' })],
        '2026-10-30',
      ),
    ).toBeNull();
  });

  it('skips non-walk metrics', () => {
    expect(
      openWalkOfferGoal(
        [
          walkChallenge({
            id: 'uc-push',
            challengeId: 'c-push',
            capture: {
              kind: 'device_session',
              metric: 'pushups',
              target: { durationMinutes: null, distanceMeters: null, count: 30 },
            },
          }),
        ],
        '2026-10-30',
      ),
    ).toBeNull();
  });
});
