import type { ChallengeHistoryEntry } from '@product/client';
import { groupHistoryByWeek, historyDayLabel, localDayKey, timesLabel } from './history-weeks';

function entry(id: string, at: Date): ChallengeHistoryEntry {
  return {
    id,
    periodKey: localDayKey(at),
    completedAt: at.toISOString(),
    outcome: 'rewarded',
    pointsDelta: 200,
    log: { kind: 'check_in' },
    evidence: null,
    proofClip: null,
  };
}

// Thursday 22 October 2026, mid-morning on the device's own clock.
const now = new Date(2026, 9, 22, 10, 0);

describe('groupHistoryByWeek', () => {
  it('groups by Monday-to-Sunday week, newest first', () => {
    const weeks = groupHistoryByWeek(
      [
        entry('mon', new Date(2026, 9, 19, 8, 20)),
        entry('thu', new Date(2026, 9, 22, 8, 10)),
        entry('last-sun', new Date(2026, 9, 18, 9, 2)),
        entry('old', new Date(2026, 9, 1, 9, 0)),
      ],
      now,
    );

    expect(weeks.map((week) => [week.label, week.entries.map((item) => item.id)])).toEqual([
      ['This week', ['thu', 'mon']],
      ['Last week', ['last-sun']],
      ['Week of 28 September', ['old']],
    ]);
  });

  it('names recent days by weekday and older ones by date', () => {
    expect(historyDayLabel(new Date(2026, 9, 20, 9).toISOString(), now)).toBe('Tuesday');
    expect(historyDayLabel(new Date(2026, 9, 1, 9).toISOString(), now)).toBe('1 October');
    expect(timesLabel(1)).toBe('1 time');
    expect(timesLabel(12)).toBe('12 times');
  });
});
