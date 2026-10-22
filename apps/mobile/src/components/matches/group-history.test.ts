import type { MatchBoard, MatchListItem, MatchStanding } from '@product/client';
import {
  finishLabel,
  pastGroupMeta,
  pastGroupSections,
  pastGroupsSummary,
  resultSummary,
} from './group-history';

function item(overrides: Partial<MatchListItem>): MatchListItem {
  return {
    id: 'm1',
    title: 'vs Ada',
    metric: 'pushups',
    scoringMode: 'best_single',
    dailyScope: 'any_challenge',
    endsAt: '2026-10-19T18:00:00.000Z',
    status: 'completed',
    participantCount: 2,
    yourScore: 32,
    yourBestCount: 32,
    yourRank: 1,
    roster: [],
    lastMove: null,
    ...overrides,
  };
}

function row(overrides: Partial<MatchStanding>): MatchStanding {
  return {
    userId: 'u',
    displayName: 'U',
    rank: 1,
    score: 0,
    bestCount: 0,
    isYou: false,
    isHost: false,
    isPending: false,
    ...overrides,
  };
}

function board(standings: MatchStanding[], winnerUserId: string | null): MatchBoard {
  return {
    id: 'm1',
    token: 't',
    inviteUrl: 'https://gethealthyapp.com/match/t',
    metric: 'walk',
    scoringMode: 'cumulative_total',
    dailyScope: 'any_challenge',
    startsAt: '2026-10-12T09:00:00.000Z',
    endsAt: '2026-10-19T09:00:00.000Z',
    status: 'completed',
    participantCount: standings.length,
    participantCap: 8,
    yourScore: 0,
    yourBestCount: 0,
    winnerUserId,
    standings,
    canSaveCrew: true,
  };
}

const now = new Date('2026-10-22T12:00:00.000Z');

describe('pastGroupSections', () => {
  it('files ended groups under the month they ended, newest first', () => {
    const sections = pastGroupSections(
      [
        item({ id: 'sep', endsAt: '2026-09-28T10:00:00.000Z' }),
        item({ id: 'oct-12', endsAt: '2026-10-12T10:00:00.000Z' }),
        item({ id: 'oct-19', endsAt: '2026-10-19T10:00:00.000Z' }),
      ],
      now,
    );

    expect(
      sections.map((section) => [section.label, section.items.map((entry) => entry.id)]),
    ).toEqual([
      ['October', ['oct-19', 'oct-12']],
      ['September', ['sep']],
    ]);
  });
});

describe('past group rows', () => {
  it('says where you finished, and nothing for a cancelled group', () => {
    expect(finishLabel(item({ yourRank: 2 }))).toBe('2nd');
    expect(finishLabel(item({ status: 'cancelled' }))).toBe('–');
    expect(pastGroupMeta(item({}))).toBe('Push-up best set · ended 19 Oct');
    expect(
      pastGroupMeta(item({ status: 'cancelled', metric: 'walk', scoringMode: 'cumulative_total' })),
    ).toBe('Walking total · cancelled');
  });

  it('counts wins on the folded row', () => {
    expect(pastGroupsSummary([item({}), item({ id: 'b', yourRank: 3 })])).toBe(
      '2 ended · you won 1',
    );
  });
});

describe('resultSummary', () => {
  it('leads with your win and the gap to second', () => {
    const summary = resultSummary(
      board(
        [
          row({ userId: 'me', isYou: true, rank: 1, score: 140 }),
          row({ userId: 'ada', displayName: 'Ada', rank: 2, score: 131 }),
        ],
        'me',
      ),
    );

    expect(summary).toEqual({
      headline: 'You won.',
      sentence: '140 minutes, 9 ahead of Ada.',
      lengthLine: 'Walking total · 7 days',
    });
  });

  it('names the winner, then your own place', () => {
    const summary = resultSummary(
      board(
        [
          row({ userId: 'ada', displayName: 'Ada', rank: 1, score: 140 }),
          row({ userId: 'kemi', displayName: 'Kemi', rank: 2, score: 120 }),
          row({ userId: 'me', isYou: true, rank: 3, score: 96 }),
        ],
        'ada',
      ),
    );

    expect(summary.headline).toBe('Ada won.');
    expect(summary.sentence).toBe('You came 3rd with 96 minutes.');
  });
});
