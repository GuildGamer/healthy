import type { LeaderboardEntry, ListLeaderboardOutput } from '@product/client';
import { boardHeadline, boardLine, boardLinkMeta, boardRows, boardStanding } from './board-rows';

function entry(rank: number, points: number, isCurrentUser = false): LeaderboardEntry {
  return { rank, displayName: `Member ${rank}`, points, isCurrentUser };
}

const TOP = Array.from({ length: 10 }, (_, index) => entry(index + 1, 6000 - index * 100));

function board(overrides: Partial<ListLeaderboardOutput>): ListLeaderboardOutput {
  return {
    weekStart: '2026-10-19',
    period: 'week',
    periodStart: '2026-10-19',
    entries: TOP,
    currentUserRank: null,
    currentUserRankAtDayStart: null,
    currentUserPoints: 0,
    currentUserVisible: true,
    aroundCurrentUser: [],
    ...overrides,
  };
}

function labels(rows: ReturnType<typeof boardRows>): string[] {
  return rows.map((row) => (row.kind === 'gap' ? '···' : String(row.entry.rank)));
}

describe('board rows', () => {
  it('shows the top three, a gap, then two either side of you', () => {
    const around = [
      entry(36, 1820),
      entry(37, 1790),
      entry(38, 1750, true),
      entry(39, 1700),
      entry(40, 1680),
    ];
    const ranked = board({
      currentUserRank: 38,
      currentUserPoints: 1750,
      aroundCurrentUser: around,
    });
    const standing = boardStanding(ranked, false);

    expect(labels(boardRows(ranked, standing))).toEqual([
      '1',
      '2',
      '3',
      '···',
      '36',
      '37',
      '38',
      '39',
      '40',
    ]);
    expect(boardHeadline(standing)).toEqual({ eyebrow: 'You’re', headline: '38th' });
    expect(boardLine(standing)).toBe('41 points to pass Member 37. Resets Monday.');
    expect(boardLinkMeta(standing)).toBe('41 points to pass 37th');
  });

  it('drops the gap near the top and shows the top six with you in it', () => {
    const around = [entry(1, 6000), entry(2, 5900, true), entry(3, 5800), entry(4, 5700)];
    const nearTop = board({
      currentUserRank: 2,
      currentUserPoints: 5900,
      aroundCurrentUser: around,
    });

    expect(labels(boardRows(nearTop, boardStanding(nearTop, false)))).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
    ]);
  });

  it('puts what earns a place in the headline before the first challenge', () => {
    const unranked = board({});
    const standing = boardStanding(unranked, false);

    expect(boardHeadline(standing)).toEqual({ eyebrow: 'Your place', headline: 'Not yet' });
    expect(boardLine(standing)).toBe('Finish one challenge to join this week’s board.');
    expect(labels(boardRows(unranked, standing))).toEqual(['1', '2', '3', '4', '5']);
  });

  it('says plainly when you are hidden, from settings or from the board', () => {
    expect(boardHeadline(boardStanding(board({ currentUserVisible: false }), false)).headline).toBe(
      'Hidden',
    );
    expect(boardLine(boardStanding(board({}), true))).toBe(
      'Nobody sees your name or points. They still count for you.',
    );
  });

  it('says one point when you are level with the next place', () => {
    const around = [entry(4, 500), entry(5, 500, true)];
    const tied = board({ currentUserRank: 5, currentUserPoints: 500, aroundCurrentUser: around });

    expect(boardLinkMeta(boardStanding(tied, false))).toBe('1 point to pass 4th');
  });
});
