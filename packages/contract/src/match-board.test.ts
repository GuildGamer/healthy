import { describe, expect, it } from 'vitest';
import { matchGroupPhrase, matchNudgePush, matchTimeLeft } from './match-board.js';

const now = new Date('2026-10-22T12:00:00.000Z');
const hoursFromNow = (hours: number) => new Date(now.getTime() + hours * 3_600_000).toISOString();

describe('matchTimeLeft', () => {
  it('counts whole days, then hours, then minutes', () => {
    expect(matchTimeLeft(hoursFromNow(4 * 24 + 3), now)).toBe('4 days left');
    expect(matchTimeLeft(hoursFromNow(24), now)).toBe('1 day left');
    expect(matchTimeLeft(hoursFromNow(5), now)).toBe('5 hours left');
    expect(matchTimeLeft(hoursFromNow(0.01), now)).toBe('1 minute left');
  });

  it('says ended once the time is up', () => {
    expect(matchTimeLeft(hoursFromNow(-1), now)).toBe('Ended');
  });
});

describe('matchGroupPhrase', () => {
  it('names the activity when the group has one', () => {
    expect(
      matchGroupPhrase({
        scoringMode: 'cumulative_total',
        metric: 'walk',
        dailyScope: 'any_challenge',
      }),
    ).toBe('your walking group');
  });

  it('names no activity for an open streak, so a push never hints at a condition', () => {
    expect(
      matchGroupPhrase({
        scoringMode: 'days_completed',
        metric: 'pushups',
        dailyScope: 'any_challenge',
      }),
    ).toBe('your group');
  });
});

describe('matchNudgePush', () => {
  it('names the sender and how long the group has left', () => {
    expect(
      matchNudgePush({
        senderName: 'Nurul',
        scoringMode: 'cumulative_total',
        metric: 'walk',
        dailyScope: 'any_challenge',
        endsAt: hoursFromNow(4 * 24 + 1),
        now,
      }),
    ).toEqual({ title: 'Nurul nudged you', body: '4 days left in your walking group.' });
  });
});
