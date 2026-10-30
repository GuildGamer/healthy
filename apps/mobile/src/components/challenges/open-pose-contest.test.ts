import type { MatchListItem } from '@product/client';
import { anotherSetRoute, openPoseContest, openPoseContestRoute } from './open-pose-contest';

function liveMatch(overrides: Partial<MatchListItem> = {}): MatchListItem {
  return {
    id: 'm1',
    title: 'Push-ups',
    hostTitle: null,
    metric: 'pushups',
    scoringMode: 'cumulative_total',
    dailyScope: 'any_challenge',
    endsAt: new Date().toISOString(),
    status: 'open',
    participantCount: 2,
    yourScore: 0,
    yourBestCount: 0,
    yourRank: 1,
    roster: [],
    lastMove: null,
    ...overrides,
  };
}

describe('openPoseContest', () => {
  it('picks an open attempt-scored contest for the exercise', () => {
    expect(openPoseContest([liveMatch()], 'pushups')?.id).toBe('m1');
  });

  it('ignores streak contests, which score finished days instead', () => {
    expect(
      openPoseContest([liveMatch({ scoringMode: 'days_completed' })], 'pushups'),
    ).toBeNull();
  });

  it('ignores a different exercise', () => {
    expect(openPoseContest([liveMatch()], 'squats')).toBeNull();
  });
});

describe('anotherSetRoute', () => {
  it('sends another set to the open contest', () => {
    expect(anotherSetRoute('c-push', 'pushups', [liveMatch()])).toBe('/matches/m1/pose');
  });

  it('falls back to practice when no contest is live', () => {
    expect(anotherSetRoute('c-push', 'pushups', [])).toBe('/challenge/c-push/practice');
  });

  it('builds the contest pose path', () => {
    expect(openPoseContestRoute([liveMatch()], 'pushups')).toBe('/matches/m1/pose');
  });
});
