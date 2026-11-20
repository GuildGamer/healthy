import { describe, expect, it } from 'vitest';
import { advancedStreakDays, laterDayKey, streakStatusFor } from './streak-days.js';

const todayKey = '2026-10-30';

describe('advancedStreakDays', () => {
  it('starts at one on the first active day ever', () => {
    expect(advancedStreakDays({ storedStreakDays: 0, lastActiveDayKey: null, todayKey })).toBe(1);
  });

  it('extends a run that was active yesterday', () => {
    expect(
      advancedStreakDays({ storedStreakDays: 4, lastActiveDayKey: '2026-10-29', todayKey }),
    ).toBe(5);
  });

  it('leaves the run alone on a second activity the same day', () => {
    expect(
      advancedStreakDays({ storedStreakDays: 5, lastActiveDayKey: todayKey, todayKey }),
    ).toBe(5);
  });

  it('restarts at one after a missed day', () => {
    expect(
      advancedStreakDays({ storedStreakDays: 9, lastActiveDayKey: '2026-10-27', todayKey }),
    ).toBe(1);
  });

  it('crosses a month boundary', () => {
    expect(
      advancedStreakDays({
        storedStreakDays: 2,
        lastActiveDayKey: '2026-10-31',
        todayKey: '2026-11-01',
      }),
    ).toBe(3);
  });

  it('treats a day ahead of today, after moving west, as already counted', () => {
    expect(
      advancedStreakDays({ storedStreakDays: 3, lastActiveDayKey: '2026-10-31', todayKey }),
    ).toBe(3);
  });
});

describe('laterDayKey', () => {
  it('moves forward to today', () => {
    expect(laterDayKey('2026-10-29', todayKey)).toBe(todayKey);
  });

  it('never rewinds after a zone change', () => {
    expect(laterDayKey('2026-10-31', todayKey)).toBe('2026-10-31');
  });

  it('takes today when nothing was recorded', () => {
    expect(laterDayKey(null, todayKey)).toBe(todayKey);
  });
});

describe('streakStatusFor', () => {
  it('is live when the last active day was yesterday', () => {
    expect(
      streakStatusFor({ storedStreakDays: 6, lastActiveDayKey: '2026-10-29', todayKey }),
    ).toEqual({ currentStreakDays: 6, streakLapsedYesterday: false });
  });

  it('says the run lapsed yesterday when its last day was the day before', () => {
    expect(
      streakStatusFor({ storedStreakDays: 6, lastActiveDayKey: '2026-10-28', todayKey }),
    ).toEqual({ currentStreakDays: 0, streakLapsedYesterday: true });
  });

  it('expires quietly once the lapse is older', () => {
    expect(
      streakStatusFor({ storedStreakDays: 6, lastActiveDayKey: '2026-10-20', todayKey }),
    ).toEqual({ currentStreakDays: 0, streakLapsedYesterday: false });
  });

  it('reports nothing without a recorded active day', () => {
    expect(streakStatusFor({ storedStreakDays: 6, lastActiveDayKey: null, todayKey })).toEqual({
      currentStreakDays: 0,
      streakLapsedYesterday: false,
    });
  });
});
