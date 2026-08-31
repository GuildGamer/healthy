import { weeklyRankLabel } from './home-rank';

describe('weeklyRankLabel', () => {
  it('names the rank when the caller has scored', () => {
    expect(weeklyRankLabel(1)).toBe('Rank 1 this week');
    expect(weeklyRankLabel(8)).toBe('Rank 8 this week');
  });

  it('falls back to the board when there is no rank yet', () => {
    expect(weeklyRankLabel(null)).toBe("This week's board");
    expect(weeklyRankLabel(undefined)).toBe("This week's board");
  });
});
