import { describe, expect, it } from 'vitest';
import { matchLengthBounds, startOfNextLocalDay } from './match-window.js';

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

describe('matchLengthBounds', () => {
  const now = new Date('2026-09-04T10:00:00.000Z');

  it('ends a today contest at the next local midnight', () => {
    expect(matchLengthBounds({ kind: 'today' }, 'Africa/Nairobi', now)).toEqual({
      startsAt: now,
      endsAt: new Date('2026-09-04T21:00:00.000Z'),
    });
  });

  it('ends a seven day contest a week from now', () => {
    expect(matchLengthBounds({ kind: 'days', days: 7 }, 'UTC', now)).toEqual({
      startsAt: now,
      endsAt: new Date('2026-09-11T10:00:00.000Z'),
    });
  });

  it('ends a custom length at the day count the host picked', () => {
    expect(matchLengthBounds({ kind: 'days', days: 45 }, 'UTC', now)).toEqual({
      startsAt: now,
      endsAt: new Date('2026-10-19T10:00:00.000Z'),
    });
  });

  it('ends a year long contest at the ceiling the contract allows', () => {
    expect(matchLengthBounds({ kind: 'days', days: 365 }, 'UTC', now)).toEqual({
      startsAt: now,
      endsAt: new Date('2027-09-04T10:00:00.000Z'),
    });
  });
});
