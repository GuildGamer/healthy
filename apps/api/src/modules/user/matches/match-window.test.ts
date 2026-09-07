import { describe, expect, it } from 'vitest';
import { matchWindowBounds, startOfNextLocalDay } from './match-window.js';

describe('startOfNextLocalDay', () => {
  it('finds midnight in Africa/Nairobi from an evening UTC instant', () => {
    const at = new Date('2026-09-04T20:00:00.000Z');
    expect(startOfNextLocalDay('Africa/Nairobi', at).toISOString()).toBe(
      '2026-09-04T21:00:00.000Z',
    );
  });

  it('falls through UTC when the zone is invalid', () => {
    const at = new Date('2026-09-04T20:00:00.000Z');
    expect(startOfNextLocalDay('Not/AZone', at).toISOString()).toBe(
      '2026-09-05T00:00:00.000Z',
    );
  });
});

describe('matchWindowBounds', () => {
  const now = new Date('2026-09-04T10:00:00.000Z');

  it('ends a today window at the next local midnight', () => {
    expect(matchWindowBounds('today', 'Africa/Nairobi', now)).toEqual({
      startsAt: now,
      endsAt: new Date('2026-09-04T21:00:00.000Z'),
    });
  });

  it('ends a week window seven days from now', () => {
    expect(matchWindowBounds('week', 'UTC', now)).toEqual({
      startsAt: now,
      endsAt: new Date('2026-09-11T10:00:00.000Z'),
    });
  });
});
