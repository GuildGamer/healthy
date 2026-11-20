import { dayShareFacts, dayShareHero } from './day-share';
import type { DayShareContent } from './types/day-share';

const day: DayShareContent = {
  weekday: 'Thursday',
  dateLabel: '22 October',
  completedCount: 4,
  totalCount: 4,
  pointsToday: 500,
  streakDays: 7,
};

describe('dayShareHero', () => {
  it('leads with the run, or the day’s count on its first day', () => {
    expect(dayShareHero(day)).toEqual({ value: '7', unit: 'days running' });
    expect(dayShareHero({ ...day, streakDays: 1, completedCount: 1 })).toEqual({
      value: '1',
      unit: 'challenge done',
    });
  });
});

describe('dayShareFacts', () => {
  it('says only counts, never repeating what the hero already says', () => {
    expect(dayShareFacts(day)).toEqual([
      { label: 'Finished', value: '4 of 4' },
      { label: 'Points', value: '+500' },
    ]);
    expect(dayShareFacts({ ...day, streakDays: 1 })).toEqual([
      { label: 'Points', value: '+500' },
      { label: 'Run', value: 'Day one' },
    ]);
  });
});
