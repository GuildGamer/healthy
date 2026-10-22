import { MATCH_CUMULATIVE_DAILY_CAP_BY_METRIC, type MatchScoringMode } from '@product/contract';
import { describe, expect, it } from 'vitest';
import { computeStandings, type MatchScoringRules, type StandingEvent } from './match-standings.js';

const MATCH_CUMULATIVE_DAILY_CAP = MATCH_CUMULATIVE_DAILY_CAP_BY_METRIC.pushups;

function pushupRules(scoringMode: MatchScoringMode): MatchScoringRules {
  return { scoringMode, metric: 'pushups' };
}

const host = {
  userId: 'host',
  displayName: 'Ada',
  image: null,
  isHost: true,
  isPending: false,
};
const bee = {
  userId: 'bee',
  displayName: 'Bee',
  image: null,
  isHost: false,
  isPending: false,
};
const cam = {
  userId: 'cam',
  displayName: 'Cam',
  image: null,
  isHost: false,
  isPending: false,
};

function set(userId: string, count: number, at: string, dayKey = at.slice(0, 10)): StandingEvent {
  return { userId, count, dayKey, occurredAt: new Date(at) };
}

describe('computeStandings — best_single', () => {
  it('ranks by highest single set and names that person the winner', () => {
    const result = computeStandings(
      [host, bee],
      [
        set('host', 12, '2026-09-04T10:00:00.000Z'),
        set('bee', 20, '2026-09-04T11:00:00.000Z'),
        set('bee', 8, '2026-09-04T12:00:00.000Z'),
      ],
      pushupRules('best_single'),
    );

    expect(result.winnerUserId).toBe('bee');
    expect(result.standings).toEqual([
      {
        userId: 'bee',
        displayName: 'Bee',
        image: null,
        rank: 1,
        score: 20,
        bestCount: 20,
        isHost: false,
        isPending: false,
      },
      {
        userId: 'host',
        displayName: 'Ada',
        image: null,
        rank: 2,
        score: 12,
        bestCount: 12,
        isHost: true,
        isPending: false,
      },
    ]);
  });

  it('never scores a member who has not accepted their seat', () => {
    const pendingBee = { ...bee, isPending: true };
    const result = computeStandings(
      [host, pendingBee],
      [
        set('host', 12, '2026-09-04T10:00:00.000Z'),
        // Would win outright if it counted. It must not: being seated from a
        // crew is not agreeing to play.
        set('bee', 40, '2026-09-04T11:00:00.000Z'),
      ],
      pushupRules('best_single'),
    );

    expect(result.winnerUserId).toBe('host');
    expect(result.standings).toMatchObject([
      { userId: 'host', score: 12, rank: 1, isPending: false },
      { userId: 'bee', score: 0, rank: 2, isPending: true },
    ]);
  });

  it('breaks a tied best count with who reached it first', () => {
    const result = computeStandings(
      [host, bee],
      [set('bee', 15, '2026-09-04T12:00:00.000Z'), set('host', 15, '2026-09-04T10:00:00.000Z')],
      pushupRules('best_single'),
    );

    expect(result.winnerUserId).toBe('host');
    expect(result.standings.map((row) => row.userId)).toEqual(['host', 'bee']);
    expect(result.standings.map((row) => row.rank)).toEqual([1, 1]);
  });

  it('leaves people with no set at the bottom and names no winner', () => {
    const result = computeStandings([host, bee, cam], [], pushupRules('best_single'));

    expect(result.winnerUserId).toBeNull();
    expect(result.standings.map((row) => row.userId)).toEqual(['bee', 'cam', 'host']);
    expect(result.standings.every((row) => row.score === 0)).toBe(true);
  });
});

describe('computeStandings — cumulative_total', () => {
  it('adds every set up across the window', () => {
    const result = computeStandings(
      [host, bee],
      [
        set('host', 12, '2026-09-04T10:00:00.000Z'),
        set('host', 15, '2026-09-05T10:00:00.000Z'),
        set('bee', 20, '2026-09-04T11:00:00.000Z'),
      ],
      pushupRules('cumulative_total'),
    );

    expect(result.winnerUserId).toBe('host');
    expect(result.standings.map((row) => row.score)).toEqual([27, 20]);
  });

  it('caps what one day can contribute so grinding one session cannot win', () => {
    const overCap = MATCH_CUMULATIVE_DAILY_CAP + 250;
    const result = computeStandings(
      [host, bee],
      [
        set('host', overCap, '2026-09-04T10:00:00.000Z'),
        set('bee', 40, '2026-09-04T11:00:00.000Z'),
        set('bee', 40, '2026-09-05T11:00:00.000Z'),
      ],
      pushupRules('cumulative_total'),
    );

    expect(result.standings[0]?.score).toBe(MATCH_CUMULATIVE_DAILY_CAP);
    expect(result.standings[1]?.score).toBe(80);
  });

  it('spends the daily allowance across sets within the same day', () => {
    const result = computeStandings(
      [host],
      [
        set('host', MATCH_CUMULATIVE_DAILY_CAP - 10, '2026-09-04T10:00:00.000Z'),
        set('host', 50, '2026-09-04T18:00:00.000Z'),
      ],
      pushupRules('cumulative_total'),
    );

    expect(result.standings[0]?.score).toBe(MATCH_CUMULATIVE_DAILY_CAP);
  });

  it('breaks a tied total with who completed it first', () => {
    const result = computeStandings(
      [host, bee],
      [
        set('bee', 10, '2026-09-04T09:00:00.000Z'),
        set('bee', 10, '2026-09-06T09:00:00.000Z'),
        set('host', 10, '2026-09-04T10:00:00.000Z'),
        set('host', 10, '2026-09-05T10:00:00.000Z'),
      ],
      pushupRules('cumulative_total'),
    );

    expect(result.standings.map((row) => row.userId)).toEqual(['host', 'bee']);
    expect(result.winnerUserId).toBe('host');
  });
});

describe('computeStandings — cumulative_total on walks', () => {
  // The cap is a health guardrail, so it has to be read in the unit the score
  // is counted in. Spending a push-up allowance on minutes would let a walking
  // contest reward five hours in a day.
  it('caps a walking day in minutes rather than in reps', () => {
    const walkCap = MATCH_CUMULATIVE_DAILY_CAP_BY_METRIC.walk;
    const result = computeStandings(
      [host],
      [set('host', walkCap + 200, '2026-09-04T10:00:00.000Z')],
      { scoringMode: 'cumulative_total', metric: 'walk' },
    );

    expect(result.standings[0]?.score).toBe(walkCap);
  });
});

describe('computeStandings — days_completed', () => {
  it('counts distinct days, not occurrences within a day', () => {
    const result = computeStandings(
      [host, bee],
      [
        set('host', 1, '2026-09-04T08:00:00.000Z'),
        set('host', 1, '2026-09-04T20:00:00.000Z'),
        set('host', 1, '2026-09-05T08:00:00.000Z'),
        set('bee', 1, '2026-09-04T08:00:00.000Z'),
      ],
      pushupRules('days_completed'),
    );

    expect(result.standings.map((row) => row.score)).toEqual([2, 1]);
    expect(result.winnerUserId).toBe('host');
  });

  it('ignores how much was done, so no day outweighs another', () => {
    const result = computeStandings(
      [host, bee],
      [
        set('host', 500, '2026-09-04T08:00:00.000Z'),
        set('bee', 1, '2026-09-04T08:00:00.000Z'),
        set('bee', 1, '2026-09-05T08:00:00.000Z'),
      ],
      pushupRules('days_completed'),
    );

    expect(result.standings.map((row) => row.userId)).toEqual(['bee', 'host']);
  });

  it('breaks a tied day count with who closed their last day first', () => {
    const result = computeStandings(
      [host, bee],
      [
        set('host', 1, '2026-09-04T08:00:00.000Z'),
        set('host', 1, '2026-09-05T08:00:00.000Z'),
        set('bee', 1, '2026-09-04T09:00:00.000Z'),
        set('bee', 1, '2026-09-05T09:00:00.000Z'),
      ],
      pushupRules('days_completed'),
    );

    expect(result.standings.map((row) => row.userId)).toEqual(['host', 'bee']);
  });

  it('uses the day key rather than the timestamp, so zones do not shift a day', () => {
    const result = computeStandings(
      [host],
      [
        // Late evening and just after midnight UTC, both the member's 4th.
        set('host', 1, '2026-09-04T23:30:00.000Z', '2026-09-04'),
        set('host', 1, '2026-09-05T00:30:00.000Z', '2026-09-04'),
      ],
      pushupRules('days_completed'),
    );

    expect(result.standings[0]?.score).toBe(1);
  });
});
