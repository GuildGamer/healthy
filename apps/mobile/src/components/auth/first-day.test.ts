import type { StarterChallenge } from '@product/client';
import { firstDayFor } from './first-day';

const noTarget = { durationMinutes: null, distanceMeters: null, count: null };

function starter(overrides: Partial<StarterChallenge>): StarterChallenge {
  return {
    challengeId: 'id',
    title: 'Title',
    description: 'Description',
    category: 'general',
    isUniversal: false,
    completionKind: 'check_in',
    capture: { kind: 'self_report', metric: null, target: noTarget },
    ...overrides,
  };
}

const starters: StarterChallenge[] = [
  starter({
    challengeId: 'walk',
    category: 'general',
    isUniversal: true,
    capture: { kind: 'device_session', metric: 'walk', target: noTarget },
  }),
  starter({
    challengeId: 'water',
    category: 'general',
    isUniversal: true,
    completionKind: 'water',
  }),
  starter({ challengeId: 'bp', category: 'hypertension', completionKind: 'vitals_bp' }),
  starter({ challengeId: 'meds', category: 'hypertension' }),
  starter({ challengeId: 'glucose', category: 'diabetes', completionKind: 'glucose' }),
];

describe('firstDayFor', () => {
  it('stays empty until something is picked', () => {
    expect(firstDayFor(starters, [])).toEqual({ steps: [], hiddenCount: 0 });
  });

  it('leads with picked conditions, then what everyone gets', () => {
    const day = firstDayFor(starters, ['hypertension']);

    expect(day.steps.map((step) => step.challengeId)).toEqual(['bp', 'meds', 'walk']);
    expect(day.hiddenCount).toBe(1);
  });

  it('shows at most three steps and counts the rest', () => {
    const day = firstDayFor(starters, ['diabetes', 'hypertension']);

    expect(day.steps.map((step) => step.challengeId)).toEqual(['glucose', 'bp', 'meds']);
    expect(day.hiddenCount).toBe(2);
  });

  it('does not repeat everyday challenges when Everyday health is picked', () => {
    const day = firstDayFor(starters, ['general']);

    expect(day.steps.map((step) => step.challengeId)).toEqual(['walk', 'water']);
    expect(day.hiddenCount).toBe(0);
  });

  it('draws walks and water with their own marks', () => {
    const day = firstDayFor(starters, ['general']);

    expect(day.steps.map((step) => step.glyph)).toEqual(['walk', 'water']);
  });
});
