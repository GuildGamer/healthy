import type { ProgressDay, ProgressDayChallenge } from '@product/client';
import { buildHistorySections } from './history-sections';
import { historyDayDetail, historyDayTitle, weekRangeLabel } from './progress-labels';

const capture = {
  kind: 'self_report' as const,
  metric: null,
  target: { durationMinutes: null, distanceMeters: null, count: null },
};

function challenge(isDone: boolean): ProgressDayChallenge {
  return { challengeId: 'c', category: 'general', completionKind: 'check_in', capture, isDone };
}

function day(dayKey: string, pointsTotal: number, done: boolean[] = []): ProgressDay {
  return {
    dayKey,
    dailyChallenges: done.map(challenge),
    pointsTotal,
    pointsLost: 0,
    isShownUp: done.some(Boolean),
  };
}

describe('buildHistorySections', () => {
  it('heads each week with its own total, newest first', () => {
    const sections = buildHistorySections({
      weekStartKey: '2026-10-19',
      days: [
        day('2026-10-22', 350),
        day('2026-10-19', 750),
        day('2026-10-18', 600),
        day('2026-10-12', 500),
        day('2026-10-11', 100),
      ],
    });

    expect(
      sections.map((section) => [section.title, section.pointsTotal, section.days.length]),
    ).toEqual([
      ['This week', 1100, 2],
      ['Last week', 1100, 2],
      ['5–11 Oct', 100, 1],
    ]);
  });
});

describe('history day labels', () => {
  it('names today, recent weekdays, and dates further back', () => {
    expect(historyDayTitle('2026-10-22', '2026-10-22', '2026-10-12')).toBe('Today');
    expect(historyDayTitle('2026-10-14', '2026-10-22', '2026-10-12')).toBe('Wednesday');
    expect(historyDayTitle('2026-10-04', '2026-10-22', '2026-10-12')).toBe('Sunday 4 Oct');
  });

  it('says how much of the day was done', () => {
    expect(historyDayDetail(day('2026-10-22', 0, [true, true, false]), true)).toBe('2 of 3 so far');
    expect(historyDayDetail(day('2026-10-20', 0, [true, true]), false)).toBe('All 2 done');
    expect(historyDayDetail(day('2026-10-20', 0, [true, false]), false)).toBe('1 of 2');
    expect(historyDayDetail(day('2026-10-21', 0, [false, false]), false)).toBe('Nothing done');
    expect(historyDayDetail(day('2026-10-22', 0, [false]), true)).toBe('Nothing yet');
    expect(
      historyDayDetail(
        { ...day('2026-10-22', 0, [false]), isShownUp: true },
        true,
      ),
    ).toBe('Set logged');
  });

  it('spells a week that crosses a month', () => {
    expect(weekRangeLabel('2026-09-28')).toMatch(/^28 Sept? – 4 Oct$/);
  });
});
