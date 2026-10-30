import { describe, expect, it } from 'vitest';
import { metricUnit, periodWindowFor, sessionAmount } from './period-window.js';

describe('periodWindowFor', () => {
  const clock = {
    timeZone: 'UTC',
    dayKey: '2026-10-22',
    weekStartKey: '2026-10-19',
    joinedDayKey: '2026-07-01',
    now: new Date('2026-10-22T12:00:00.000Z'),
  };

  it('opens the week on Monday through today', () => {
    expect(periodWindowFor({ ...clock, period: 'week' })).toEqual({
      startDayKey: '2026-10-19',
      endDayKey: '2026-10-22',
      periodLabel: 'Oct 19–22',
    });
  });

  it('opens the month on the first', () => {
    expect(periodWindowFor({ ...clock, period: 'month' })).toMatchObject({
      startDayKey: '2026-10-01',
      endDayKey: '2026-10-22',
      periodLabel: 'October',
    });
  });

  it('opens all time on the join day', () => {
    expect(periodWindowFor({ ...clock, period: 'all' })).toEqual({
      startDayKey: '2026-07-01',
      endDayKey: '2026-10-22',
      periodLabel: 'All time',
    });
  });

  it('does not start before the member joined', () => {
    expect(
      periodWindowFor({
        ...clock,
        joinedDayKey: '2026-10-20',
        period: 'week',
      }).startDayKey,
    ).toBe('2026-10-20');
  });
});

describe('sessionAmount', () => {
  it('counts walk minutes and plank seconds', () => {
    expect(sessionAmount('walk', null, 125)).toBe(2);
    expect(sessionAmount('plank', 40, 40)).toBe(40);
    expect(sessionAmount('pushups', 20, 30)).toBe(20);
  });
});

describe('metricUnit', () => {
  it('names the share unit', () => {
    expect(metricUnit('walk')).toBe('minutes');
    expect(metricUnit('pushups')).toBe('push-ups');
  });
});
