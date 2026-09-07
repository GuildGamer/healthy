import {
  labelForLeaderboardCategory,
  leaderboardIntro,
  leaderboardQueryInput,
  leaderboardRankWindow,
} from './leaderboard-filters';

describe('labelForLeaderboardCategory', () => {
  it('names the open board and a single condition', () => {
    expect(labelForLeaderboardCategory('all')).toBe('All categories');
    expect(labelForLeaderboardCategory('hypertension')).toBe('Blood pressure');
  });
});

describe('leaderboardIntro', () => {
  it('describes each ranking window', () => {
    expect(leaderboardIntro('week')).toContain('since Monday');
    expect(leaderboardIntro('month')).toContain('this month');
    expect(leaderboardIntro('all')).toContain('All-time');
  });
});

describe('leaderboardRankWindow', () => {
  it('names the window used in the off-page rank line', () => {
    expect(leaderboardRankWindow('week')).toBe('this week');
    expect(leaderboardRankWindow('month')).toBe('this month');
    expect(leaderboardRankWindow('all')).toBe('all time');
  });
});

describe('leaderboardQueryInput', () => {
  it('omits category when the board is unfiltered', () => {
    expect(leaderboardQueryInput('month', 'all')).toEqual({ period: 'month' });
  });

  it('sends the selected condition', () => {
    expect(leaderboardQueryInput('week', 'hypertension')).toEqual({
      period: 'week',
      category: 'hypertension',
    });
  });
});
