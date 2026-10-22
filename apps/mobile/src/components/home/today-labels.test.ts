import {
  groupMoveActivity,
  lastReadingLabel,
  minutesAgoLabel,
  nextDayKey,
  ordinal,
  runLabel,
  shareDayMessage,
  streakSentence,
  tallyLabel,
  weeklyRankLabel,
} from './today-labels';

const counts = {
  completedCount: 0,
  openCount: 4,
  totalCount: 4,
  isDayDone: false,
  showsMembershipLine: false,
};

describe('tallyLabel', () => {
  it('reads as what is left before anything is done', () => {
    expect(tallyLabel(counts)).toEqual({ strong: '4 to go', rest: null });
  });

  it('reads as done and to go part way through', () => {
    expect(tallyLabel({ ...counts, completedCount: 2, openCount: 2 })).toEqual({
      strong: '2 done',
      rest: '2 to go',
    });
  });

  it('says the day is done, or the free win is locked with extras', () => {
    expect(tallyLabel({ ...counts, completedCount: 4, openCount: 0, isDayDone: true })).toEqual({
      strong: '4 done',
      rest: 'All done',
    });
    expect(
      tallyLabel({
        ...counts,
        completedCount: 2,
        openCount: 2,
        isDayDone: true,
        showsMembershipLine: true,
      }),
    ).toEqual({ strong: 'Win locked', rest: '2 extra' });
  });
});

describe('runLabel', () => {
  const run = (streakDays: number, lapsedYesterday: boolean, bestStreakDays = 0) =>
    runLabel({ streakDays, lapsedYesterday, bestStreakDays });

  it('counts the run, or starts a new one after a miss', () => {
    expect(run(6, false, 12)).toBe('6 days running');
    expect(run(1, false)).toBe('1 day running');
    expect(run(0, true)).toBe('New run today');
    expect(run(0, false)).toBeNull();
  });

  it('keeps the best run in view once the run resets', () => {
    expect(run(0, true, 12)).toBe('Best run 12 days');
    expect(run(0, false, 3)).toBe('Best run 3 days');
    expect(run(0, true, 1)).toBe('New run today');
  });
});

describe('lastReadingLabel', () => {
  it('says when, by name within the week and by date after it', () => {
    expect(lastReadingLabel('2026-10-21', '2026-10-22')).toBe('Last reading yesterday');
    expect(lastReadingLabel('2026-10-19', '2026-10-22')).toBe('Last reading Monday');
    expect(lastReadingLabel('2026-10-12', '2026-10-22')).toBe('Last reading 12 October');
  });
});

describe('weeklyRankLabel', () => {
  it('says how far today moved the rank, only when it climbed', () => {
    expect(weeklyRankLabel(4, 6)).toBe('this week, up 2');
    expect(weeklyRankLabel(4, 4)).toBe('this week');
    expect(weeklyRankLabel(4, 3)).toBe('this week');
    expect(weeklyRankLabel(4, null)).toBe('this week');
  });
});

describe('minutesAgoLabel', () => {
  const now = new Date('2026-10-22T14:00:00.000Z');

  it('reads as a moment ago, minutes, then hours', () => {
    expect(minutesAgoLabel('2026-10-22T13:59:40.000Z', now)).toBe('just now');
    expect(minutesAgoLabel('2026-10-22T13:56:00.000Z', now)).toBe('4 min ago');
    expect(minutesAgoLabel('2026-10-22T11:30:00.000Z', now)).toBe('2 h ago');
  });
});

describe('groupMoveActivity', () => {
  it('names the move by what the group counts', () => {
    expect(groupMoveActivity({ scoringMode: 'days_completed', metric: 'walk' })).toBe(
      'showed up today',
    );
    expect(groupMoveActivity({ scoringMode: 'best_single', metric: 'pushups' })).toBe('did a set');
    expect(groupMoveActivity({ scoringMode: 'cumulative_total', metric: 'walk' })).toBe(
      'logged a walk',
    );
  });
});

describe('streakSentence', () => {
  it('only speaks once there is a run to speak of', () => {
    expect(streakSentence(7)).toBe('7 days in a row.');
    expect(streakSentence(1)).toBeNull();
  });
});

describe('ordinal', () => {
  it.each([
    [1, '1st'],
    [2, '2nd'],
    [3, '3rd'],
    [4, '4th'],
    [11, '11th'],
    [12, '12th'],
    [13, '13th'],
    [21, '21st'],
    [102, '102nd'],
  ])('%p is %p', (rank, label) => {
    expect(ordinal(rank)).toBe(label);
  });
});

describe('nextDayKey', () => {
  it('rolls over months and years', () => {
    expect(nextDayKey('2026-10-22')).toBe('2026-10-23');
    expect(nextDayKey('2026-12-31')).toBe('2027-01-01');
  });
});

describe('shareDayMessage', () => {
  it('says what was done and the run, and nothing measured', () => {
    expect(shareDayMessage(4, 7)).toBe(
      'I finished 4 challenges on Healthy today. 7 days in a row.',
    );
    expect(shareDayMessage(1, 0)).toBe('I finished 1 challenge on Healthy today.');
  });
});
