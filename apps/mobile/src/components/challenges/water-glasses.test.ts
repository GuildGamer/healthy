import type { TodayChallenge } from '@product/client';
import { glassLoggedLine, waterGlassCount, waterGlassDraft, waterGlassGoal } from './water-glasses';

function water(overrides: Partial<TodayChallenge>): TodayChallenge {
  return {
    status: 'in_progress',
    draft: null,
    capture: {
      kind: 'structured_log',
      metric: null,
      target: { durationMinutes: null, distanceMeters: null, count: null },
    },
    ...overrides,
  } as TodayChallenge;
}

describe('water glasses', () => {
  it('aims for eight glasses unless the challenge sets its own count', () => {
    expect(waterGlassGoal(water({}))).toBe(8);
    expect(
      waterGlassGoal(
        water({
          capture: {
            kind: 'structured_log',
            metric: null,
            target: { durationMinutes: null, distanceMeters: null, count: 6 },
          },
        }),
      ),
    ).toBe(6);
  });

  it('keeps the running total in the draft', () => {
    expect(
      waterGlassCount(water({ draft: { kind: 'water', fields: { amount: 3, unit: 'glasses' } } })),
    ).toBe(3);
    expect(
      waterGlassCount(water({ draft: { kind: 'water', fields: { amount: 900, unit: 'ml' } } })),
    ).toBe(0);
  });

  it('drops the amount from the draft when the count is back to none', () => {
    expect(waterGlassDraft(0)).toEqual({ kind: 'water', fields: { unit: 'glasses' } });
    expect(waterGlassDraft(2)).toEqual({ kind: 'water', fields: { amount: 2, unit: 'glasses' } });
  });

  it('names the glass just logged', () => {
    expect(glassLoggedLine(3)).toBe('Third glass logged');
    expect(glassLoggedLine(12)).toBe('Glass 12 logged');
  });
});
