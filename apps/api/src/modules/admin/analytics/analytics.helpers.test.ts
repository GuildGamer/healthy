import { describe, expect, it } from 'vitest';
import {
  bucketByDay,
  countryShares,
  rate,
  resolveRange,
  streakBucketKey,
} from './analytics.helpers.js';

describe('analytics.helpers', () => {
  it('resolves a closed lookback window ending today UTC', () => {
    const { days, rangeStart, weekStart } = resolveRange(7);
    expect(days).toBe(7);
    expect(weekStart.getTime()).toBeLessThanOrEqual(rangeStart.getTime());
  });

  it('computes rates safely', () => {
    expect(rate(1, 4)).toBe(0.25);
    expect(rate(1, 0)).toBe(0);
  });

  it('buckets streak lengths', () => {
    expect(streakBucketKey(0)).toBe('0');
    expect(streakBucketKey(2)).toBe('1–3');
    expect(streakBucketKey(40)).toBe('31+');
  });

  it('shares countries including unknown', () => {
    const shares = countryShares(['US', 'US', null, 'GB']);
    expect(shares[0]).toMatchObject({ countryCode: 'US', members: 2 });
    expect(shares.find((row) => row.countryCode == null)?.members).toBe(1);
  });

  it('fills empty days in sparklines', () => {
    const start = new Date('2026-08-01T00:00:00.000Z');
    const series = bucketByDay(
      [new Date('2026-08-01T12:00:00.000Z'), new Date('2026-08-01T18:00:00.000Z')],
      start,
      3,
    );
    expect(series).toEqual([
      { day: '2026-08-01', count: 2 },
      { day: '2026-08-02', count: 0 },
      { day: '2026-08-03', count: 0 },
    ]);
  });
});
