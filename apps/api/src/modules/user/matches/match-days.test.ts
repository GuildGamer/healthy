import { describe, expect, it } from 'vitest';
import { dayStripFor, movedDayKeysByUser } from './match-days.js';

const DAY_MS = 86_400_000;
const startsAt = new Date('2026-10-15T09:00:00.000Z');
const now = new Date('2026-10-18T12:00:00.000Z');

function strip(
  days: number,
  scoringMode: 'days_completed' | 'cumulative_total' = 'days_completed',
) {
  return dayStripFor({
    scoringMode,
    startsAt,
    endsAt: new Date(startsAt.getTime() + days * DAY_MS),
    timeZone: 'UTC',
    now,
  });
}

describe('dayStripFor', () => {
  it('gives a square to every date a week-long streak touches', () => {
    expect(strip(7)).toEqual({
      dayKeys: [
        '2026-10-15',
        '2026-10-16',
        '2026-10-17',
        '2026-10-18',
        '2026-10-19',
        '2026-10-20',
        '2026-10-21',
        '2026-10-22',
      ],
      todayKey: '2026-10-18',
    });
  });

  it('keeps the number past a week, and for every other way to win', () => {
    expect(strip(8)).toBeNull();
    expect(strip(7, 'cumulative_total')).toBeNull();
  });
});

describe('movedDayKeysByUser', () => {
  it('lists the strip days each accepted member moved the board on, in order', () => {
    const at = new Date();
    const days = movedDayKeysByUser(
      [
        { userId: 'ada', count: 1, dayKey: '2026-10-17', occurredAt: at },
        { userId: 'ada', count: 1, dayKey: '2026-10-15', occurredAt: at },
        { userId: 'ada', count: 1, dayKey: '2026-10-15', occurredAt: at },
        { userId: 'pending', count: 1, dayKey: '2026-10-15', occurredAt: at },
      ],
      new Set(['ada']),
      { dayKeys: ['2026-10-15', '2026-10-16', '2026-10-17'], todayKey: '2026-10-17' },
    );

    expect(Object.fromEntries(days)).toEqual({ ada: ['2026-10-15', '2026-10-17'] });
  });
});
