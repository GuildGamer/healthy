import type { ProgressDay } from '@product/client';
import { weekLine, weekMeasureUnit } from './progress-labels';
import { buildWeekSummary } from './week-summary';

function day(dayKey: string, isShownUp: boolean): ProgressDay {
  return { dayKey, dailyChallenges: [], pointsTotal: 0, pointsLost: 0, isShownUp };
}

const MONDAY = '2026-10-19';
const THURSDAY = '2026-10-22';

describe('buildWeekSummary', () => {
  it('counts mid-week from Monday, with a missed day left empty', () => {
    const summary = buildWeekSummary({
      dayKey: THURSDAY,
      weekStartKey: MONDAY,
      joinedDayKey: '2026-08-01',
      days: [
        day(THURSDAY, true),
        day('2026-10-21', false),
        day('2026-10-20', true),
        day(MONDAY, true),
      ],
    });

    expect(summary.days.map((item) => item.state)).toEqual([
      'shownUp',
      'shownUp',
      'missed',
      'shownUp',
      'upcoming',
      'upcoming',
      'upcoming',
    ]);
    expect(weekMeasureUnit(summary)).toBe('of 4 days so far');
    expect(summary.shownUpCount).toBe(3);
    expect(weekLine(summary)).toBeNull();
  });

  it('leaves today open and says how to fill it before the first challenge', () => {
    const summary = buildWeekSummary({
      dayKey: THURSDAY,
      weekStartKey: MONDAY,
      joinedDayKey: '2026-08-01',
      days: [day(THURSDAY, false), day(MONDAY, true)],
    });

    expect(summary.days[3]).toEqual({ dayKey: THURSDAY, state: 'open', isToday: true });
    expect(weekLine(summary)).toBe('Finish one challenge to fill today.');
  });

  it('does not count the days before someone joined', () => {
    const summary = buildWeekSummary({
      dayKey: THURSDAY,
      weekStartKey: MONDAY,
      joinedDayKey: '2026-10-21',
      days: [day(THURSDAY, true), day('2026-10-21', false)],
    });

    expect(summary.days.slice(0, 2).map((item) => item.state)).toEqual([
      'beforeJoining',
      'beforeJoining',
    ]);
    expect(weekMeasureUnit(summary)).toBe('of 2 days so far');
  });

  it('drops "so far" and says one quiet sentence once all seven are in', () => {
    const sunday = '2026-10-25';
    const days = Array.from({ length: 7 }, (_, index) =>
      day(`2026-10-${String(19 + index)}`, true),
    );
    const summary = buildWeekSummary({
      dayKey: sunday,
      weekStartKey: MONDAY,
      joinedDayKey: '2026-08-01',
      days,
    });

    expect(weekMeasureUnit(summary)).toBe('of 7 days');
    expect(weekLine(summary)).toBe('Every day this week. A new one starts tomorrow.');
  });
});
