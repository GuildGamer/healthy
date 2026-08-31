import type { TodayChallenge } from '@product/client';
import {
  homeChallengesHasMore,
  previewTodayChallenges,
} from './preview-today-challenges';

function challenge(overrides: Partial<TodayChallenge>): TodayChallenge {
  return {
    id: 'uc1',
    challengeId: 'c1',
    title: 'Walk 20 minutes',
    description: 'A brisk walk after lunch.',
    category: 'general',
    rewardPoints: 20,
    status: 'pending',
    frequency: 'daily',
    completionKind: 'check_in',
    instruction: 'A brisk walk after lunch.',
    icon: 'walk',
    periodKey: '2026-08-28',
    evidenceRequest: null,
    draft: null,
    progress: { filled: 0, required: 1 },
    capture: {
      kind: 'self_report',
      metric: null,
      target: { durationMinutes: null, distanceMeters: null, count: null },
    },
    ...overrides,
  };
}

describe('previewTodayChallenges', () => {
  it('keeps focus plus two up-next rows for Home', () => {
    const preview = previewTodayChallenges([
      challenge({ id: 'a', title: 'Alpha', status: 'pending' }),
      challenge({ id: 'b', title: 'Beta', status: 'in_progress' }),
      challenge({ id: 'c', title: 'Charlie', status: 'pending' }),
      challenge({ id: 'd', title: 'Delta', status: 'pending' }),
      challenge({ id: 'e', title: 'Echo', status: 'pending' }),
    ]);

    expect(preview.map((item) => item.id)).toEqual(['b', 'a', 'c']);
  });

  it('does not surface completed challenges on Home', () => {
    const preview = previewTodayChallenges([
      challenge({ id: 'done', status: 'completed' }),
      challenge({ id: 'open', status: 'pending' }),
      challenge({ id: 'also-done', status: 'completed' }),
    ]);

    expect(preview.map((item) => item.id)).toEqual(['open']);
    expect(homeChallengesHasMore([
      challenge({ id: 'done', status: 'completed' }),
      challenge({ id: 'open', status: 'pending' }),
    ])).toBe(true);
  });
});
