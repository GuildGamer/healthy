import { describe, expect, it } from 'vitest';
import { startOfUtcWeek, weekStartKey } from './week.js';

describe('startOfUtcWeek', () => {
  it.each([
    ['2026-08-31T09:00:00Z', '2026-08-31'], // Monday itself
    ['2026-09-02T23:59:59Z', '2026-08-31'], // midweek
    ['2026-09-06T23:59:59Z', '2026-08-31'], // Sunday, still the same week
    ['2026-09-07T00:00:00Z', '2026-09-07'], // next Monday opens a new one
  ])('maps %s to the week opening %s', (now, expected) => {
    expect(startOfUtcWeek(new Date(now)).toISOString().slice(0, 10)).toBe(
      expected,
    );
  });

  it('opens exactly at midnight', () => {
    const start = startOfUtcWeek(new Date('2026-09-02T13:45:12.345Z'));

    expect(start.toISOString()).toBe('2026-08-31T00:00:00.000Z');
  });

  it('crosses a month boundary', () => {
    expect(weekStartKey(new Date('2026-10-01T12:00:00Z'))).toBe('2026-09-28');
  });
});
