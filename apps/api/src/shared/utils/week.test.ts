import { describe, expect, it } from 'vitest';
import {
  rankingWindow,
  startOfUtcMonth,
  startOfUtcWeek,
  weekStartKey,
} from './week.js';

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

describe('startOfUtcMonth', () => {
  it.each([
    ['2026-08-01T00:00:00Z', '2026-08-01'],
    ['2026-08-30T12:00:00Z', '2026-08-01'],
    ['2026-09-01T00:00:00Z', '2026-09-01'],
  ])('maps %s to the month opening %s', (now, expected) => {
    expect(startOfUtcMonth(new Date(now)).toISOString().slice(0, 10)).toBe(
      expected,
    );
  });

  it('opens exactly at midnight', () => {
    expect(startOfUtcMonth(new Date('2026-08-30T13:45:12.345Z')).toISOString()).toBe(
      '2026-08-01T00:00:00.000Z',
    );
  });
});

describe('rankingWindow', () => {
  const now = new Date('2026-08-30T12:00:00Z');

  it('opens the week on Monday', () => {
    expect(rankingWindow('week', now)).toEqual({
      start: new Date('2026-08-24T00:00:00.000Z'),
      periodStart: '2026-08-24',
    });
  });

  it('opens the month on the 1st', () => {
    expect(rankingWindow('month', now)).toEqual({
      start: new Date('2026-08-01T00:00:00.000Z'),
      periodStart: '2026-08-01',
    });
  });

  it('has no start for all-time', () => {
    expect(rankingWindow('all', now)).toEqual({
      start: null,
      periodStart: null,
    });
  });
});
