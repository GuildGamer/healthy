import { emptyChallengeTarget } from '@product/contract';
import { describe, expect, it } from 'vitest';
import { buildProgressDays, dayKeysNewestFirst } from './progress-days.js';
import type { DailyOccurrence } from './types/progress.js';

function occurrence(dayKey: string, challengeId: string, isRewarded: boolean): DailyOccurrence {
  return {
    dayKey,
    challengeId,
    isRewarded,
    category: 'general',
    completionKind: 'check_in',
    capture: { kind: 'self_report', metric: null, target: emptyChallengeTarget },
  };
}

describe('dayKeysNewestFirst', () => {
  it('lists every day back to the first, across a month end', () => {
    expect(dayKeysNewestFirst('2026-09-29', '2026-10-02')).toEqual([
      '2026-10-02',
      '2026-10-01',
      '2026-09-30',
      '2026-09-29',
    ]);
  });

  it('is just the one day when both ends are the same', () => {
    expect(dayKeysNewestFirst('2026-10-22', '2026-10-22')).toEqual(['2026-10-22']);
  });
});

describe('buildProgressDays', () => {
  it('keeps a row for a day with nothing in it', () => {
    const [day] = buildProgressDays({ dayKeys: ['2026-10-21'], occurrences: [], ledger: [] });

    expect(day).toEqual({
      dayKey: '2026-10-21',
      dailyChallenges: [],
      pointsTotal: 0,
      pointsLost: 0,
      isShownUp: false,
    });
  });

  it('nets the day and counts only photo-check losses as lost', () => {
    const [day] = buildProgressDays({
      dayKeys: ['2026-10-20'],
      occurrences: [],
      ledger: [
        { dayKey: '2026-10-20', delta: 150, isChallengeLinked: true },
        { dayKey: '2026-10-20', delta: -100, isChallengeLinked: true },
        { dayKey: '2026-10-20', delta: -20, isChallengeLinked: false },
        { dayKey: '2026-10-19', delta: 500, isChallengeLinked: true },
      ],
    });

    expect(day?.pointsTotal).toBe(30);
    expect(day?.pointsLost).toBe(100);
  });

  it('shows up on a day with one rewarded daily challenge, and marks each one', () => {
    const [day] = buildProgressDays({
      dayKeys: ['2026-10-20'],
      occurrences: [
        occurrence('2026-10-20', 'water', true),
        occurrence('2026-10-20', 'walk', false),
      ],
      ledger: [],
    });

    expect(day?.isShownUp).toBe(true);
    expect(
      day?.dailyChallenges.map((challenge) => [challenge.challengeId, challenge.isDone]),
    ).toEqual([
      ['water', true],
      ['walk', false],
    ]);
  });

  it('does not count a day whose only finish lost its photo check', () => {
    const [day] = buildProgressDays({
      dayKeys: ['2026-10-20'],
      occurrences: [occurrence('2026-10-20', 'gym', false)],
      ledger: [{ dayKey: '2026-10-20', delta: -100, isChallengeLinked: true }],
    });

    expect(day?.isShownUp).toBe(false);
  });

  it('shows up when a measured set was logged with no rewarded challenge', () => {
    const [day] = buildProgressDays({
      dayKeys: ['2026-10-20'],
      occurrences: [occurrence('2026-10-20', 'push', false)],
      ledger: [],
      measuredDayKeys: new Set(['2026-10-20']),
    });

    expect(day?.isShownUp).toBe(true);
    expect(day?.dailyChallenges[0]?.isDone).toBe(false);
  });
});
