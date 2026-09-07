import { ORPCError } from '@orpc/server';
import { describe, expect, it, vi } from 'vitest';
import {
  MATCH_ENDED,
  MATCH_FULL,
  MATCH_NOT_HOST,
  MATCH_NOT_OPEN,
} from './errors/match.errors.js';
import { MatchesService } from './matches.service.js';

const host = { id: 'host', email: 'host@a.co', name: 'Ada' };
const guest = { id: 'guest', email: 'guest@a.co', name: 'Bee' };

function profile(userId: string, displayName: string) {
  return {
    userId,
    displayName,
    timeZone: 'Africa/Nairobi',
  };
}

function userWithProfile(userId: string, displayName: string) {
  return {
    id: userId,
    name: displayName,
    profile: profile(userId, displayName),
  };
}

type MockAttempt = {
  id: string;
  matchId: string;
  userId: string;
  count: number;
  durationSeconds: number;
  source: string;
  recordedAt: Date;
};

type MockParticipant = {
  id: string;
  matchId: string;
  userId: string;
  joinedAt: Date;
  user: ReturnType<typeof userWithProfile>;
};

type MockMatch = {
  id: string;
  hostUserId: string;
  inviteToken: string;
  metric: string;
  scoringMode: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
  winnerUserId: string | null;
  settledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  hostUser: ReturnType<typeof userWithProfile>;
  participants: MockParticipant[];
  attempts: MockAttempt[];
};

function loadedMatch(overrides: Partial<MockMatch> = {}): MockMatch {
  const endsAt = new Date(Date.now() + 60 * 60 * 1000);
  return {
    id: 'm1',
    hostUserId: host.id,
    inviteToken: 'invite_token_1',
    metric: 'pushups',
    scoringMode: 'best_single',
    startsAt: new Date('2026-09-04T10:00:00.000Z'),
    endsAt,
    status: 'open',
    winnerUserId: null,
    settledAt: null,
    createdAt: new Date('2026-09-04T10:00:00.000Z'),
    updatedAt: new Date('2026-09-04T10:00:00.000Z'),
    hostUser: userWithProfile(host.id, 'Ada'),
    participants: [
      {
        id: 'p1',
        matchId: 'm1',
        userId: host.id,
        joinedAt: new Date('2026-09-04T10:00:00.000Z'),
        user: userWithProfile(host.id, 'Ada'),
      },
    ],
    attempts: [],
    ...overrides,
  };
}

function createPrismaMock(match = loadedMatch()) {
  const current = { match };
  const prisma = {
    current,
    userProfile: {
      findUnique: vi.fn().mockResolvedValue(profile(host.id, 'Ada')),
    },
    match: {
      findUnique: vi.fn().mockImplementation(() => Promise.resolve(current.match)),
      findUniqueOrThrow: vi.fn().mockImplementation(() => Promise.resolve(current.match)),
      create: vi.fn().mockResolvedValue({ id: 'm1', inviteToken: 'invite_token_1' }),
      updateMany: vi.fn().mockImplementation(async ({ data }) => {
        if (current.match.status !== 'open') {
          return { count: 0 };
        }

        current.match = {
          ...current.match,
          ...data,
        };
        return { count: 1 };
      }),
    },
    matchParticipant: {
      count: vi.fn().mockImplementation(async () => current.match.participants.length),
      create: vi.fn().mockImplementation(async ({ data }: { data: { userId: string } }) => {
        current.match = {
          ...current.match,
          participants: [
            ...current.match.participants,
            {
              id: 'p-new',
              matchId: current.match.id,
              userId: data.userId,
              joinedAt: new Date(),
              user: userWithProfile(data.userId, 'Bee'),
            },
          ],
        };
        return { id: 'p-new' };
      }),
      findMany: vi.fn().mockImplementation(async ({ where }: { where: { userId: string } }) =>
        current.match.participants
          .filter((row) => row.userId === where.userId)
          .map((row) => ({ ...row, match: current.match })),
      ),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    matchAttempt: {
      create: vi.fn().mockImplementation(async ({ data }: { data: { count: number } }) => {
        current.match = {
          ...current.match,
          attempts: [
            ...current.match.attempts,
            {
              id: 'a1',
              matchId: current.match.id,
              userId: guest.id,
              count: data.count,
              durationSeconds: 30,
              source: 'in_app_pose',
              recordedAt: new Date(),
            },
          ],
        };
        return { id: 'a1' };
      }),
    },
    $transaction: vi.fn(async (fn: (tx: typeof prisma) => Promise<unknown>) =>
      fn(prisma),
    ),
  };
  return prisma;
}

describe('MatchesService', () => {
  it('rejects unauthenticated callers', async () => {
    const service = new MatchesService(createPrismaMock() as never);

    await expect(service.preview(null, 'invite_token_1')).rejects.toBeInstanceOf(
      ORPCError,
    );
  });

  it('lets a guest join an open match under the cap', async () => {
    const prisma = createPrismaMock();
    const service = new MatchesService(prisma as never);

    const board = await service.join(guest, 'invite_token_1');

    expect(board.participantCount).toBe(2);
    expect(board.standings.some((row) => row.isYou)).toBe(true);
  });

  it('returns the board when the guest is already in', async () => {
    const match = loadedMatch({
      participants: [
        {
          id: 'p1',
          matchId: 'm1',
          userId: host.id,
          joinedAt: new Date(),
          user: userWithProfile(host.id, 'Ada'),
        },
        {
          id: 'p2',
          matchId: 'm1',
          userId: guest.id,
          joinedAt: new Date(),
          user: userWithProfile(guest.id, 'Bee'),
        },
      ],
    });
    const prisma = createPrismaMock(match);
    const service = new MatchesService(prisma as never);

    await expect(service.join(guest, 'invite_token_1')).resolves.toMatchObject({
      id: 'm1',
      participantCount: 2,
    });
    expect(prisma.matchParticipant.create).not.toHaveBeenCalled();
  });

  it('rejects a join once eight people are in', async () => {
    const participants = Array.from({ length: 8 }, (_, index) => {
      const userId = index === 0 ? host.id : `u${index}`;
      return {
        id: `p${index}`,
        matchId: 'm1',
        userId,
        joinedAt: new Date(),
        user: userWithProfile(userId, `P${index}`),
      };
    });
    const prisma = createPrismaMock(loadedMatch({ participants }));
    const service = new MatchesService(prisma as never);

    await expect(service.join(guest, 'invite_token_1')).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: MATCH_FULL,
    });
  });

  it('settles an expired match on read and blocks a new set', async () => {
    const prisma = createPrismaMock(
      loadedMatch({
        endsAt: new Date('2020-01-01T00:00:00.000Z'),
        participants: [
          {
            id: 'p1',
            matchId: 'm1',
            userId: host.id,
            joinedAt: new Date(),
            user: userWithProfile(host.id, 'Ada'),
          },
          {
            id: 'p2',
            matchId: 'm1',
            userId: guest.id,
            joinedAt: new Date(),
            user: userWithProfile(guest.id, 'Bee'),
          },
        ],
      }),
    );
    const service = new MatchesService(prisma as never);

    await expect(service.join(guest, 'invite_token_1')).resolves.toMatchObject({
      status: 'completed',
    });
    expect(prisma.match.updateMany).toHaveBeenCalled();

    await expect(
      service.submitAttempt(guest, {
        matchId: 'm1',
        count: 10,
        durationSeconds: 20,
        source: 'in_app_pose',
      }),
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: MATCH_NOT_OPEN,
    });
  });

  it('records a pose set against the match and not a habit', async () => {
    const match = loadedMatch({
      participants: [
        {
          id: 'p1',
          matchId: 'm1',
          userId: host.id,
          joinedAt: new Date(),
          user: userWithProfile(host.id, 'Ada'),
        },
        {
          id: 'p2',
          matchId: 'm1',
          userId: guest.id,
          joinedAt: new Date(),
          user: userWithProfile(guest.id, 'Bee'),
        },
      ],
    });
    const prisma = createPrismaMock(match);
    const service = new MatchesService(prisma as never);

    const board = await service.submitAttempt(guest, {
      matchId: 'm1',
      count: 18,
      durationSeconds: 40,
      source: 'in_app_pose',
    });

    expect(board.yourBestCount).toBe(18);
    expect(prisma.matchAttempt.create).toHaveBeenCalled();
  });

  it('lists a joined match for the guest under the host name', async () => {
    const prisma = createPrismaMock(loadedMatch());
    const service = new MatchesService(prisma as never);

    await service.join(guest, 'invite_token_1');

    await expect(service.listMine(guest)).resolves.toMatchObject({
      live: [{ id: 'm1', title: 'vs Ada' }],
      ended: [],
    });
    await expect(service.listMine(host)).resolves.toMatchObject({
      live: [{ id: 'm1', title: 'vs Bee' }],
    });
  });

  it('lets the host cancel an open match', async () => {
    const prisma = createPrismaMock(loadedMatch());
    const service = new MatchesService(prisma as never);

    await expect(service.cancel(host, 'm1')).resolves.toMatchObject({
      id: 'm1',
      status: 'cancelled',
      winnerUserId: null,
    });
  });

  it('rejects cancel from anyone but the host', async () => {
    const prisma = createPrismaMock(
      loadedMatch({
        participants: [
          {
            id: 'p1',
            matchId: 'm1',
            userId: host.id,
            joinedAt: new Date(),
            user: userWithProfile(host.id, 'Ada'),
          },
          {
            id: 'p2',
            matchId: 'm1',
            userId: guest.id,
            joinedAt: new Date(),
            user: userWithProfile(guest.id, 'Bee'),
          },
        ],
      }),
    );
    const service = new MatchesService(prisma as never);

    await expect(service.cancel(guest, 'm1')).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: MATCH_NOT_HOST,
    });
  });

  it('rejects cancel once the match is already closed', async () => {
    const prisma = createPrismaMock(loadedMatch({ status: 'completed' }));
    const service = new MatchesService(prisma as never);

    await expect(service.cancel(host, 'm1')).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: MATCH_NOT_OPEN,
    });
  });

  it('rejects joining a cancelled match', async () => {
    const prisma = createPrismaMock(loadedMatch({ status: 'cancelled' }));
    const service = new MatchesService(prisma as never);

    await expect(service.join(guest, 'invite_token_1')).rejects.toMatchObject({
      message: MATCH_ENDED,
    });
  });
});
