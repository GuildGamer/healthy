import type { MatchListItem, MatchStanding } from '@product/contract';
import { describe, expect, it } from 'vitest';
import { pickReminderRivalry } from './match-reminder-rivalry.js';
import type { ReminderContest } from './types/reminder-contest.js';

const NOW = new Date('2026-10-26T10:00:00.000Z');
const IN_FIVE_HOURS = '2026-10-26T15:00:00.000Z';
const IN_THREE_DAYS = '2026-10-29T10:00:00.000Z';

function standing(
  userId: string,
  rank: number,
  score: number,
  overrides: Partial<MatchStanding> = {},
): MatchStanding {
  return {
    userId,
    displayName: userId,
    image: null,
    rank,
    score,
    bestCount: score,
    isYou: userId === 'you',
    isHost: false,
    isPending: false,
    ...overrides,
  };
}

function contest(
  standings: MatchStanding[],
  options: {
    id?: string;
    endsAt?: string;
    scoringMode?: MatchListItem['scoringMode'];
    doneToday?: string[];
  } = {},
): ReminderContest {
  const you = standings.find((row) => row.isYou);
  return {
    item: {
      id: options.id ?? 'm1',
      title: 'Push-up Sunday',
      metric: 'pushups',
      scoringMode: options.scoringMode ?? 'cumulative_total',
      dailyScope: 'chosen_activity',
      endsAt: options.endsAt ?? IN_THREE_DAYS,
      status: 'open',
      participantCount: standings.length,
      yourScore: you?.score ?? 0,
      yourBestCount: you?.score ?? 0,
      yourRank: you?.rank ?? null,
      roster: standings.slice(0, 3),
      lastMove: null,
      standings,
    },
    doneTodayUserIds: new Set(options.doneToday ?? []),
  };
}

describe('pickReminderRivalry', () => {
  it('names the leader when you trail in the last day', () => {
    const rivalry = pickReminderRivalry(
      [contest([standing('ada', 1, 30), standing('you', 2, 20)], { endsAt: IN_FIVE_HOURS })],
      NOW,
    );

    expect(rivalry).toEqual({
      matchId: 'm1',
      situation: 'group_closing',
      contestTitle: 'Push-up Sunday',
      scoringMode: 'cumulative_total',
      metric: 'pushups',
      rivalName: 'ada',
      rivalScore: 30,
      yourScore: 20,
      timeLeft: '5 hours left',
    });
  });

  it('ranks closing above a rival who moved today', () => {
    const rivalry = pickReminderRivalry(
      [
        contest([standing('ada', 1, 30), standing('you', 2, 20)], {
          endsAt: IN_FIVE_HOURS,
          doneToday: ['ada'],
        }),
      ],
      NOW,
    );

    expect(rivalry?.situation).toBe('group_closing');
  });

  it('names a rival above you who scored today when you have not', () => {
    const contests = [
      contest([standing('ada', 1, 30), standing('you', 2, 20)], { doneToday: ['ada'] }),
    ];

    expect(pickReminderRivalry(contests, NOW)).toMatchObject({
      situation: 'group_rival_moved',
      rivalName: 'ada',
    });
  });

  it('stays quiet about a move once you have scored today too', () => {
    const contests = [
      contest([standing('ada', 1, 30), standing('you', 2, 20)], { doneToday: ['ada', 'you'] }),
    ];

    expect(pickReminderRivalry(contests, NOW)).toBeNull();
  });

  it('does not treat a move below you as a threat in a total contest', () => {
    const contests = [
      contest([standing('you', 1, 40), standing('ada', 2, 10)], { doneToday: ['ada'] }),
    ];

    expect(pickReminderRivalry(contests, NOW)).toBeNull();
  });

  it('names anyone who showed up today in a streak contest, ahead or behind', () => {
    const contests = [
      contest([standing('you', 1, 4), standing('ada', 2, 2)], {
        scoringMode: 'days_completed',
        doneToday: ['ada'],
      }),
    ];

    expect(pickReminderRivalry(contests, NOW)).toMatchObject({
      situation: 'group_streak_gap',
      rivalName: 'ada',
    });
  });

  it('asks you to defend a lead inside the close margin', () => {
    const contests = [contest([standing('you', 1, 20), standing('ada', 2, 17)])];

    expect(pickReminderRivalry(contests, NOW)).toMatchObject({
      situation: 'group_defend',
      rivalName: 'ada',
      rivalScore: 17,
      yourScore: 20,
    });
  });

  it('asks you to defend a tie you lead on the tie-break', () => {
    const contests = [contest([standing('you', 1, 20), standing('ada', 2, 20)])];

    expect(pickReminderRivalry(contests, NOW)?.situation).toBe('group_defend');
  });

  it('leaves a comfortable lead alone', () => {
    const contests = [contest([standing('you', 1, 40), standing('ada', 2, 10)])];

    expect(pickReminderRivalry(contests, NOW)).toBeNull();
  });

  it('never names a pending seat', () => {
    const contests = [
      contest(
        [
          standing('pat', 1, 0, { isPending: true }),
          standing('you', 2, 0),
          standing('ada', 3, 0),
        ],
        { endsAt: IN_FIVE_HOURS, doneToday: ['pat'] },
      ),
    ];

    expect(pickReminderRivalry(contests, NOW)).toBeNull();
  });

  it('skips a contest with nobody accepted beside you', () => {
    const contests = [
      contest([standing('you', 1, 5), standing('pat', 2, 0, { isPending: true })]),
    ];

    expect(pickReminderRivalry(contests, NOW)).toBeNull();
  });

  it('skips an empty board where nobody has scored', () => {
    const contests = [
      contest([standing('ada', 1, 0), standing('you', 2, 0)], { endsAt: IN_FIVE_HOURS }),
    ];

    expect(pickReminderRivalry(contests, NOW)).toBeNull();
  });

  it('prefers the contest ending soonest', () => {
    const later = contest([standing('ada', 1, 30), standing('you', 2, 20)], {
      id: 'later',
      doneToday: ['ada'],
    });
    const sooner = contest([standing('you', 1, 20), standing('bo', 2, 19)], {
      id: 'sooner',
      endsAt: '2026-10-27T10:00:00.000Z',
    });

    expect(pickReminderRivalry([later, sooner], NOW)?.matchId).toBe('sooner');
  });

  it('falls through to a later contest when the soonest has nothing at stake', () => {
    const quiet = contest([standing('you', 1, 40), standing('bo', 2, 1)], {
      id: 'quiet',
      endsAt: IN_FIVE_HOURS,
    });
    const live = contest([standing('ada', 1, 30), standing('you', 2, 20)], {
      id: 'live',
      doneToday: ['ada'],
    });

    expect(pickReminderRivalry([quiet, live], NOW)?.matchId).toBe('live');
  });
});
