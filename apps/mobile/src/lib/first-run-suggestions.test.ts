import type { CatalogChallenge } from '@product/client';
import { pickFirstRunSuggestions } from './first-run-suggestions';

function catalogChallenge(overrides: Partial<CatalogChallenge>): CatalogChallenge {
  return {
    challengeId: 'c1',
    slug: 'c1',
    title: 'Log your water',
    description: '',
    category: 'general',
    rewardPoints: 100,
    sortOrder: 100,
    frequency: 'daily',
    completionKind: 'water',
    instruction: '',
    icon: 'cup-water',
    isEnrolled: false,
    requiresMembership: false,
    isLocked: false,
    reminders: [],
    capture: {
      kind: 'structured_log',
      metric: null,
      target: { durationMinutes: null, distanceMeters: null, count: null },
    },
    ...overrides,
  };
}

describe('pickFirstRunSuggestions', () => {
  it('offers the chosen conditions first, then everyday ones, two at most', () => {
    const suggestions = pickFirstRunSuggestions(
      [
        catalogChallenge({ challengeId: 'water', category: 'general' }),
        catalogChallenge({ challengeId: 'bp', category: 'hypertension' }),
        catalogChallenge({ challengeId: 'walk', category: 'general' }),
      ],
      ['hypertension'],
    );

    expect(suggestions.map((item) => item.challengeId)).toEqual(['bp', 'water']);
  });

  it('skips what is already picked or locked behind membership', () => {
    const suggestions = pickFirstRunSuggestions(
      [
        catalogChallenge({ challengeId: 'picked', isEnrolled: true }),
        catalogChallenge({ challengeId: 'locked', isLocked: true }),
        catalogChallenge({ challengeId: 'open' }),
      ],
      [],
    );

    expect(suggestions.map((item) => item.challengeId)).toEqual(['open']);
  });
});
