import type { MatchStanding } from '@product/contract';
import { describe, expect, it, vi } from 'vitest';
import { MatchReminderRivalryService } from './match-reminder-rivalry.service.js';
import type { ReminderContest } from './types/reminder-contest.js';

const NOW = new Date('2026-10-26T10:00:00.000Z');

function standing(userId: string, rank: number, score: number): MatchStanding {
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
  };
}

function trailingContest(id: string): ReminderContest {
  const standings = [standing('ada', 1, 30), standing('you', 2, 20)];
  return {
    item: {
      id,
      title: `Contest ${id}`,
      metric: 'pushups',
      scoringMode: 'cumulative_total',
      dailyScope: 'chosen_activity',
      endsAt: '2026-10-29T10:00:00.000Z',
      status: 'open',
      participantCount: 2,
      yourScore: 20,
      yourBestCount: 20,
      yourRank: 2,
      roster: standings,
      lastMove: null,
      standings,
    },
    doneTodayUserIds: new Set(['ada']),
  };
}

function createService(options: {
  optedIn: string[];
  inbox?: Array<{ userId: string; payload: unknown; createdAt: Date }>;
  contests?: ReminderContest[];
}) {
  const prisma = {
    userProfile: {
      findMany: vi.fn().mockResolvedValue(options.optedIn.map((userId) => ({ userId }))),
    },
    notification: {
      findMany: vi.fn().mockResolvedValue(options.inbox ?? []),
    },
  };
  const matches = {
    liveContestsForReminders: vi.fn().mockResolvedValue(options.contests ?? []),
  };
  const service = new MatchReminderRivalryService(prisma as never, matches as never);
  return { service, prisma, matches };
}

describe('MatchReminderRivalryService', () => {
  it('returns the picked group for an opted-in member', async () => {
    const { service } = createService({ optedIn: ['you'], contests: [trailingContest('m1')] });

    const rivalries = await service.loadMany([{ userId: 'you', timeZone: 'UTC' }], NOW);

    expect(rivalries.get('you')).toMatchObject({
      matchId: 'm1',
      situation: 'group_rival_moved',
    });
  });

  it('loads nothing for a member who turned group pushes off', async () => {
    const { service, matches } = createService({
      optedIn: [],
      contests: [trailingContest('m1')],
    });

    const rivalries = await service.loadMany([{ userId: 'you', timeZone: 'UTC' }], NOW);

    expect(rivalries.size).toBe(0);
    expect(matches.liveContestsForReminders).not.toHaveBeenCalled();
  });

  it('skips a group that already reached the member today and falls back to the next', async () => {
    const { service } = createService({
      optedIn: ['you'],
      inbox: [
        { userId: 'you', payload: { matchId: 'm1' }, createdAt: new Date('2026-10-26T08:00:00.000Z') },
      ],
      contests: [trailingContest('m1'), trailingContest('m2')],
    });

    const rivalries = await service.loadMany([{ userId: 'you', timeZone: 'UTC' }], NOW);

    expect(rivalries.get('you')?.matchId).toBe('m2');
  });

  it('judges "today" in the member’s own zone', async () => {
    const { service } = createService({
      optedIn: ['you'],
      inbox: [
        { userId: 'you', payload: { matchId: 'm1' }, createdAt: new Date('2026-10-26T05:00:00.000Z') },
      ],
      contests: [trailingContest('m1')],
    });

    const rivalries = await service.loadMany(
      [{ userId: 'you', timeZone: 'America/Los_Angeles' }],
      NOW,
    );

    expect(rivalries.get('you')?.matchId).toBe('m1');
  });

  it('ignores inbox rows that are not about a group', async () => {
    const { service } = createService({
      optedIn: ['you'],
      inbox: [
        { userId: 'you', payload: { destination: 'today' }, createdAt: NOW },
        { userId: 'you', payload: null, createdAt: NOW },
      ],
      contests: [trailingContest('m1')],
    });

    const rivalries = await service.loadMany([{ userId: 'you', timeZone: 'UTC' }], NOW);

    expect(rivalries.get('you')?.matchId).toBe('m1');
  });
});
