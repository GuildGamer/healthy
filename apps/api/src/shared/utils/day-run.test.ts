import { describe, expect, it } from 'vitest';
import { longestConsecutiveDayRun } from './day-run.js';

describe('longestConsecutiveDayRun', () => {
  it('is zero without any days', () => {
    expect(longestConsecutiveDayRun([])).toBe(0);
  });

  it('finds the longest stretch, wherever it sits', () => {
    expect(
      longestConsecutiveDayRun([
        '2026-10-01',
        '2026-10-02',
        '2026-10-05',
        '2026-10-06',
        '2026-10-07',
        '2026-10-09',
      ]),
    ).toBe(3);
  });

  it('runs across a month end and ignores order and repeats', () => {
    expect(longestConsecutiveDayRun(['2026-11-01', '2026-10-31', '2026-10-30', '2026-10-31'])).toBe(
      3,
    );
  });
});
