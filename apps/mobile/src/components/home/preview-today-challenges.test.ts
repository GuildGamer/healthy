import type { TodayChallenge } from '@product/client';
import { previewTodayChallenges } from './preview-today-challenges';

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
    periodKey: '2026-08-28',
    ...overrides,
  };
}

describe('previewTodayChallenges', () => {
  it('keeps five open challenges and leaves the rest for the list page', () => {
    const preview = previewTodayChallenges([
      challenge({ id: 'a', status: 'pending' }),
      challenge({ id: 'b', status: 'in_progress' }),
      challenge({ id: 'c', status: 'pending' }),
      challenge({ id: 'd', status: 'pending' }),
      challenge({ id: 'e', status: 'pending' }),
      challenge({ id: 'f', status: 'pending' }),
    ]);

    expect(preview.map((item) => item.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('surfaces unfinished work before completed ones', () => {
    const preview = previewTodayChallenges([
      challenge({ id: 'done', status: 'completed' }),
      challenge({ id: 'open', status: 'pending' }),
      challenge({ id: 'also-done', status: 'completed' }),
    ]);

    expect(preview.map((item) => item.id)).toEqual(['open', 'done', 'also-done']);
  });
});
