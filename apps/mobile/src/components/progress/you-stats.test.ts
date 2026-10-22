import { youStats } from './you-stats';

const me = { currentStreakDays: 1, bestStreakDays: 12, pointsBalance: 4350 };

describe('youStats', () => {
  it('shows the run with its record, points, and this week’s place', () => {
    const stats = youStats(me, { kind: 'ranked', rank: 38, ahead: null, points: 1750 });

    expect(stats.map(({ value, aside, label }) => [value, aside ?? null, label])).toEqual([
      ['1', 'best 12', 'day run'],
      ['4,350', null, 'points'],
      ['38th', null, 'this week'],
    ]);
  });

  it('leaves out the record while the current run is the best one', () => {
    const [run] = youStats({ ...me, bestStreakDays: 1 }, { kind: 'unranked' });

    expect(run?.aside).toBeNull();
  });

  it('has no place before the first challenge, and says hidden when hidden', () => {
    expect(youStats(me, { kind: 'unranked' })[2]?.value).toBe('—');
    expect(youStats(me, { kind: 'hidden' })[2]?.value).toBe('Hidden');
  });
});
