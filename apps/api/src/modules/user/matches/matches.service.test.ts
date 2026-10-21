import { ORPCError } from '@orpc/server';
import { describe, expect, it, vi } from 'vitest';
import { readEnvironment } from '../../shared-modules/config/index.js';
import { CrewsService } from '../crews/index.js';
import {
  MATCH_COUNT_TOO_LARGE,
  MATCH_ENDED,
  MATCH_FULL,
  MATCH_NOT_HOST,
  MATCH_NOT_OPEN,
  MATCH_WRONG_ACTIVITY,
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

function userWithProfile(
  userId: string,
  displayName: string,
  image: string | null = null,
) {
  return {
    id: userId,
    name: displayName,
    image,
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
  /// Null only for a crew-seated member who has not accepted.
  acceptedAt: Date | null;
  user: ReturnType<typeof userWithProfile>;
};

type MockMatch = {
  id: string;
  hostUserId: string;
  inviteToken: string;
  metric: string;
  scoringMode: string;
  dailyScope: string;
  startsAt: Date;
  endsAt: Date;
  status: string;
  winnerUserId: string | null;
  settledAt: Date | null;
  crewId: string | null;
  parentMatchId: string | null;
  sourceUserChallengeId: string | null;
  experimentId: string | null;
  experimentVariantKey: string | null;
  firstOpenedAt: Date | null;
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
    dailyScope: 'any_challenge',
    startsAt: new Date('2026-09-04T10:00:00.000Z'),
    endsAt,
    status: 'open',
    winnerUserId: null,
    settledAt: null,
    crewId: null,
    parentMatchId: null,
    sourceUserChallengeId: null,
    experimentId: null,
    experimentVariantKey: null,
    firstOpenedAt: null,
    createdAt: new Date('2026-09-04T10:00:00.000Z'),
    updatedAt: new Date('2026-09-04T10:00:00.000Z'),
    hostUser: userWithProfile(host.id, 'Ada'),
    participants: [
      {
        id: 'p1',
        matchId: 'm1',
        userId: host.id,
        joinedAt: new Date('2026-09-04T10:00:00.000Z'),
        acceptedAt: new Date('2026-09-04T10:00:00.000Z'),
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
    crew: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    matchParticipant: {
      createMany: vi.fn().mockImplementation(async ({ data }: { data: { userId: string }[] }) => {
        current.match = {
          ...current.match,
          participants: [
            ...current.match.participants,
            ...data.map((row, index) => ({
              id: `p-crew-${index}`,
              matchId: current.match.id,
              userId: row.userId,
              joinedAt: new Date(),
              acceptedAt: null,
              user: userWithProfile(row.userId, 'Cam'),
            })),
          ],
        };
        return { count: data.length };
      }),
      updateMany: vi.fn().mockImplementation(async ({ where }: { where: { userId: string } }) => {
        current.match = {
          ...current.match,
          participants: current.match.participants.map((row) =>
            row.userId === where.userId ? { ...row, acceptedAt: new Date() } : row,
          ),
        };
        return { count: 1 };
      }),
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
              acceptedAt: new Date(),
              user: userWithProfile(data.userId, 'Bee'),
            },
          ],
        };
        return { id: 'p-new' };
      }),
      findMany: vi
        .fn()
        .mockImplementation(async ({ where }: { where: { userId: string } }) =>
          current.match.participants
            .filter((row) => row.userId === where.userId)
            .map((row) => ({ ...row, match: current.match })),
        ),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    matchAttempt: {
      create: vi.fn().mockImplementation(
        async ({
          data,
        }: {
          data: {
            userId: string;
            count: number;
            durationSeconds: number;
            source: string;
          };
        }) => {
          current.match = {
            ...current.match,
            attempts: [
              ...current.match.attempts,
              {
                id: 'a1',
                matchId: current.match.id,
                userId: data.userId,
                count: data.count,
                durationSeconds: data.durationSeconds,
                source: data.source,
                recordedAt: new Date(),
              },
            ],
          };
          return { id: 'a1' };
        },
      ),
    },
    userChallenge: {
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
    },
    deviceActivityLog: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    analyticsEvent: {
      create: vi.fn().mockResolvedValue({ id: 'evt1' }),
    },
    $transaction: vi.fn(async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma)),
  };
  return prisma;
}

const websiteUrl = 'https://gethealthyapp.com';

function createNotifierSpy() {
  return { notifySeated: vi.fn().mockResolvedValue(undefined) };
}

function createInviteAcceptedSpy() {
  return { notifyHost: vi.fn().mockResolvedValue(undefined) };
}

function createBoardMoveSpy() {
  return { notifyParticipants: vi.fn().mockResolvedValue(undefined) };
}

function createAnalyticsSpy() {
  return { track: vi.fn().mockResolvedValue({ ok: true as const }) };
}

function createService(
  prisma: ReturnType<typeof createPrismaMock>,
  notifier: ReturnType<typeof createNotifierSpy> = createNotifierSpy(),
  analytics: ReturnType<typeof createAnalyticsSpy> = createAnalyticsSpy(),
  inviteAccepted: ReturnType<typeof createInviteAcceptedSpy> = createInviteAcceptedSpy(),
  boardMove: ReturnType<typeof createBoardMoveSpy> = createBoardMoveSpy(),
): MatchesService {
  return new MatchesService(
    prisma as never,
    readEnvironment({ WEBSITE_URL: websiteUrl }),
    new CrewsService(prisma as never),
    notifier as never,
    analytics as never,
    inviteAccepted as never,
    boardMove as never,
  );
}

function completion(userId: string, periodKey: string, completedAt: string) {
  return { userId, periodKey, completedAt: new Date(completedAt) };
}

function walkLog(userId: string, durationSeconds: number, endedAt = '2026-09-04T11:00:00.000Z') {
  return {
    userId,
    durationSeconds,
    endedAt: new Date(endedAt),
    createdAt: new Date(endedAt),
  };
}

/** The `where` a walk contest built to read logged activity. */
function walkQueryWhere(prisma: ReturnType<typeof createPrismaMock>) {
  const [call] = prisma.deviceActivityLog.findMany.mock.calls;
  return (call?.[0] as { where: { userId: { in: string[] }; source: { in: string[] } } }).where;
}

function twoPersonMatch(overrides: Partial<MockMatch> = {}) {
  return loadedMatch({
    participants: [
      {
        id: 'p1',
        matchId: 'm1',
        userId: host.id,
        joinedAt: new Date(),
        acceptedAt: new Date(),
        user: userWithProfile(host.id, 'Ada'),
      },
      {
        id: 'p2',
        matchId: 'm1',
        userId: guest.id,
        joinedAt: new Date(),
        acceptedAt: new Date(),
        user: userWithProfile(guest.id, 'Bee'),
      },
    ],
    ...overrides,
  });
}

describe('MatchesService', () => {
  it('rejects unauthenticated callers', async () => {
    const service = createService(createPrismaMock());

    await expect(service.preview(null, 'invite_token_1')).rejects.toBeInstanceOf(ORPCError);
  });

  it('returns host score and distribution fields on preview', async () => {
    const match = loadedMatch({
      parentMatchId: 'parent-1',
      experimentId: 'exp-1',
      experimentVariantKey: 'treatment',
      attempts: [
        {
          id: 'a1',
          matchId: 'm1',
          userId: host.id,
          count: 22,
          durationSeconds: 40,
          source: 'in_app_pose',
          recordedAt: new Date(),
        },
        {
          id: 'a2',
          matchId: 'm1',
          userId: host.id,
          count: 18,
          durationSeconds: 35,
          source: 'in_app_pose',
          recordedAt: new Date(),
        },
      ],
    });
    const service = createService(createPrismaMock(match));

    await expect(service.preview(guest, 'invite_token_1')).resolves.toMatchObject({
      hostScore: 22,
      parentMatchId: 'parent-1',
      experimentId: 'exp-1',
      experimentVariantKey: 'treatment',
      alreadyJoined: false,
      viewerIsHost: false,
    });
  });

  it('public preview marks first open and tracks anonymously', async () => {
    const prisma = createPrismaMock();
    const analytics = createAnalyticsSpy();
    const service = createService(prisma, createNotifierSpy(), analytics);

    await expect(service.publicPreview('invite_token_1')).resolves.toMatchObject({
      token: 'invite_token_1',
      hostDisplayName: 'Ada',
      metric: 'pushups',
      hostScore: null,
      status: 'open',
    });

    expect(prisma.match.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'm1', firstOpenedAt: null },
        data: expect.objectContaining({ firstOpenedAt: expect.any(Date) }),
      }),
    );
    expect(analytics.track).toHaveBeenCalledWith(
      null,
      expect.objectContaining({ name: 'challenge_link_opened' }),
    );
  });

  it('lets a guest join an open match under the cap', async () => {
    const prisma = createPrismaMock();
    const analytics = createAnalyticsSpy();
    const inviteAccepted = createInviteAcceptedSpy();
    const service = createService(prisma, createNotifierSpy(), analytics, inviteAccepted);

    const board = await service.join(guest, 'invite_token_1');

    expect(board.participantCount).toBe(2);
    expect(board.standings.some((row) => row.isYou)).toBe(true);
    expect(analytics.track).toHaveBeenCalledWith(
      guest,
      expect.objectContaining({ name: 'challenge_accepted' }),
    );
    expect(inviteAccepted.notifyHost).toHaveBeenCalledWith({
      matchId: 'm1',
      hostUserId: host.id,
      acceptedUserId: guest.id,
      acceptedDisplayName: 'Bee',
    });
  });

  it('still joins when the acceptance push fails', async () => {
    const prisma = createPrismaMock();
    const inviteAccepted = createInviteAcceptedSpy();
    inviteAccepted.notifyHost.mockRejectedValue(new Error('expo down'));
    const service = createService(
      prisma,
      createNotifierSpy(),
      createAnalyticsSpy(),
      inviteAccepted,
    );

    const board = await service.join(guest, 'invite_token_1');

    expect(board.participantCount).toBe(2);
  });

  it('returns the board when the guest is already in', async () => {
    const match = loadedMatch({
      participants: [
        {
          id: 'p1',
          matchId: 'm1',
          userId: host.id,
          joinedAt: new Date(),
          acceptedAt: new Date(),
          user: userWithProfile(host.id, 'Ada'),
        },
        {
          id: 'p2',
          matchId: 'm1',
          userId: guest.id,
          joinedAt: new Date(),
          acceptedAt: new Date(),
          user: userWithProfile(guest.id, 'Bee'),
        },
      ],
    });
    const prisma = createPrismaMock(match);
    const inviteAccepted = createInviteAcceptedSpy();
    const service = createService(
      prisma,
      createNotifierSpy(),
      createAnalyticsSpy(),
      inviteAccepted,
    );

    await expect(service.join(guest, 'invite_token_1')).resolves.toMatchObject({
      id: 'm1',
      participantCount: 2,
    });
    expect(prisma.matchParticipant.create).not.toHaveBeenCalled();
    expect(inviteAccepted.notifyHost).not.toHaveBeenCalled();
  });

  it('rejects a join once eight people are in', async () => {
    const participants = Array.from({ length: 8 }, (_, index) => {
      const userId = index === 0 ? host.id : `u${index}`;
      return {
        id: `p${index}`,
        matchId: 'm1',
        userId,
        joinedAt: new Date(),
        acceptedAt: new Date(),
        user: userWithProfile(userId, `P${index}`),
      };
    });
    const prisma = createPrismaMock(loadedMatch({ participants }));
    const service = createService(prisma);

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
            acceptedAt: new Date(),
            user: userWithProfile(host.id, 'Ada'),
          },
          {
            id: 'p2',
            matchId: 'm1',
            userId: guest.id,
            joinedAt: new Date(),
            acceptedAt: new Date(),
            user: userWithProfile(guest.id, 'Bee'),
          },
        ],
      }),
    );
    const service = createService(prisma);

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
          acceptedAt: new Date(),
          user: userWithProfile(host.id, 'Ada'),
        },
        {
          id: 'p2',
          matchId: 'm1',
          userId: guest.id,
          joinedAt: new Date(),
          acceptedAt: new Date(),
          user: userWithProfile(guest.id, 'Bee'),
        },
      ],
    });
    const prisma = createPrismaMock(match);
    const boardMove = createBoardMoveSpy();
    const service = createService(
      prisma,
      createNotifierSpy(),
      createAnalyticsSpy(),
      createInviteAcceptedSpy(),
      boardMove,
    );

    const board = await service.submitAttempt(guest, {
      matchId: 'm1',
      count: 18,
      durationSeconds: 40,
      source: 'in_app_pose',
    });

    expect(board.yourBestCount).toBe(18);
    expect(prisma.matchAttempt.create).toHaveBeenCalled();
    expect(boardMove.notifyParticipants).toHaveBeenCalledWith({
      matchId: 'm1',
      attemptOrEventId: 'a1',
      actorUserId: guest.id,
      actorDisplayName: 'Bee',
      actorScoreBefore: 0,
      actorScoreAfter: 18,
      recipients: [{ userId: host.id, score: 0 }],
    });
  });

  it('reads the live display name and profile image on the board', async () => {
    const match = loadedMatch({
      participants: [
        {
          id: 'p1',
          matchId: 'm1',
          userId: host.id,
          joinedAt: new Date(),
          acceptedAt: new Date(),
          user: userWithProfile(host.id, 'Ada', 'data:image/jpeg;base64,ada'),
        },
        {
          id: 'p2',
          matchId: 'm1',
          userId: guest.id,
          joinedAt: new Date(),
          acceptedAt: new Date(),
          user: userWithProfile(guest.id, 'OldBee'),
        },
      ],
    });
    const prisma = createPrismaMock(match);
    const service = createService(prisma);

    // Rename after join — the board must not keep the join-time string.
    const guestSeat = match.participants.find((row) => row.userId === guest.id);
    if (guestSeat) {
      guestSeat.user = userWithProfile(guest.id, 'NewBee', 'data:image/jpeg;base64,bee');
    }

    const board = await service.get(host, 'm1');

    expect(board.standings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: host.id,
          displayName: 'Ada',
          image: 'data:image/jpeg;base64,ada',
        }),
        expect.objectContaining({
          userId: guest.id,
          displayName: 'NewBee',
          image: 'data:image/jpeg;base64,bee',
        }),
      ]),
    );
  });

  it('keeps the attempt when the board-move push fails', async () => {
    const match = loadedMatch({
      participants: [
        {
          id: 'p1',
          matchId: 'm1',
          userId: host.id,
          joinedAt: new Date(),
          acceptedAt: new Date(),
          user: userWithProfile(host.id, 'Ada'),
        },
        {
          id: 'p2',
          matchId: 'm1',
          userId: guest.id,
          joinedAt: new Date(),
          acceptedAt: new Date(),
          user: userWithProfile(guest.id, 'Bee'),
        },
      ],
    });
    const prisma = createPrismaMock(match);
    const boardMove = createBoardMoveSpy();
    boardMove.notifyParticipants.mockRejectedValue(new Error('expo down'));
    const service = createService(
      prisma,
      createNotifierSpy(),
      createAnalyticsSpy(),
      createInviteAcceptedSpy(),
      boardMove,
    );

    const board = await service.submitAttempt(guest, {
      matchId: 'm1',
      count: 18,
      durationSeconds: 40,
      source: 'in_app_pose',
    });

    expect(board.yourScore).toBe(18);
    expect(prisma.matchAttempt.create).toHaveBeenCalled();
  });

  // The capture has to match what the contest is scored on, or a walk becomes
  // reps and a contest is won with the wrong activity.
  it('refuses a walk logged into a push-up contest', async () => {
    const prisma = createPrismaMock(loadedMatch({ metric: 'pushups' }));
    const service = createService(prisma);

    await expect(
      service.submitAttempt(host, {
        matchId: 'm1',
        count: 30,
        durationSeconds: 1_800,
        source: 'in_app_walk',
      }),
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: MATCH_WRONG_ACTIVITY,
    });
    expect(prisma.matchAttempt.create).not.toHaveBeenCalled();
  });

  it('refuses a score beyond what the activity can produce', async () => {
    const prisma = createPrismaMock(loadedMatch({ metric: 'walk' }));
    const service = createService(prisma);

    await expect(
      service.submitAttempt(host, {
        matchId: 'm1',
        // Minutes, so more than a day of walking in one attempt.
        count: 5_000,
        durationSeconds: 3_600,
        source: 'in_app_walk',
      }),
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: MATCH_COUNT_TOO_LARGE,
    });
    expect(prisma.matchAttempt.create).not.toHaveBeenCalled();
  });

  it('lists a joined match for the guest under the host name', async () => {
    const prisma = createPrismaMock(loadedMatch());
    const service = createService(prisma);

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
    const service = createService(prisma);

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
            acceptedAt: new Date(),
            user: userWithProfile(host.id, 'Ada'),
          },
          {
            id: 'p2',
            matchId: 'm1',
            userId: guest.id,
            joinedAt: new Date(),
            acceptedAt: new Date(),
            user: userWithProfile(guest.id, 'Bee'),
          },
        ],
      }),
    );
    const service = createService(prisma);

    await expect(service.cancel(guest, 'm1')).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: MATCH_NOT_HOST,
    });
  });

  it('rejects cancel once the match is already closed', async () => {
    const prisma = createPrismaMock(loadedMatch({ status: 'completed' }));
    const service = createService(prisma);

    await expect(service.cancel(host, 'm1')).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: MATCH_NOT_OPEN,
    });
  });

  it('rejects joining a cancelled match', async () => {
    const prisma = createPrismaMock(loadedMatch({ status: 'cancelled' }));
    const service = createService(prisma);

    await expect(service.join(guest, 'invite_token_1')).rejects.toMatchObject({
      message: MATCH_ENDED,
    });
  });

  it('stores the scoring mode the host picked', async () => {
    const prisma = createPrismaMock();
    const service = createService(prisma);

    await service.create(host, {
      window: 'week',
      metric: 'pushups',
      scoringMode: 'days_completed',
      dailyScope: 'any_challenge',
    });

    expect(prisma.match.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ scoringMode: 'days_completed' }),
      }),
    );
  });

  it('seeds the host attempt from a completed push-up occurrence', async () => {
    const prisma = createPrismaMock();
    prisma.userChallenge.findUnique.mockResolvedValue({
      id: 'uc-1',
      userId: host.id,
      status: 'completed',
      deviceActivityLog: {
        metric: 'pushups',
        count: 27,
        durationSeconds: 45,
      },
    });
    const service = createService(prisma);

    await service.create(host, {
      window: 'today',
      metric: 'pushups',
      scoringMode: 'best_single',
      dailyScope: 'any_challenge',
      sourceUserChallengeId: 'uc-1',
      experimentId: 'exp-1',
      experimentVariantKey: 'treatment',
    });

    expect(prisma.match.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourceUserChallengeId: 'uc-1',
          experimentId: 'exp-1',
          experimentVariantKey: 'treatment',
        }),
      }),
    );
    expect(prisma.matchAttempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: host.id,
          count: 27,
          durationSeconds: 45,
          source: 'in_app_pose',
        }),
      }),
    );
  });

  // The metric used to ride on the Prisma column default, so every contest was
  // push-ups whatever the host picked.
  it('stores the activity the host picked', async () => {
    const prisma = createPrismaMock();
    const service = createService(prisma);

    await service.create(host, {
      window: 'week',
      metric: 'walk',
      scoringMode: 'cumulative_total',
      dailyScope: 'any_challenge',
    });

    expect(prisma.match.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ metric: 'walk' }),
      }),
    );
  });

  it('hands back an https invite a non-user can open', async () => {
    const service = createService(createPrismaMock());

    const created = await service.create(host, {
      window: 'week',
      metric: 'pushups',
      scoringMode: 'best_single',
      dailyScope: 'any_challenge',
    });

    expect(created.match.inviteUrl).toBe(`${websiteUrl}/match/invite_token_1`);
    expect(created.invite.url).toBe(created.match.inviteUrl);
  });

  it('seats a saved crew pending, so nobody is scored before accepting', async () => {
    const prisma = createPrismaMock();
    prisma.crew.findUnique.mockResolvedValue({
      id: 'crew-1',
      ownerUserId: host.id,
      name: 'Bee, Cam',
      ownerUser: userWithProfile(host.id, 'Ada'),
      members: [
        { userId: 'cam', leftAt: null, user: userWithProfile('cam', 'Cam') },
        // Already left, so the crew can no longer seat them.
        { userId: 'dee', leftAt: new Date(), user: userWithProfile('dee', 'Dee') },
      ],
    });
    const service = createService(prisma);

    const created = await service.create(host, {
      window: 'week',
      metric: 'pushups',
      scoringMode: 'best_single',
      dailyScope: 'any_challenge',
      crewId: 'crew-1',
    });

    expect(prisma.matchParticipant.createMany).toHaveBeenCalledWith({
      data: [{ matchId: 'm1', userId: 'cam', acceptedAt: null }],
    });

    const cam = created.match.standings.find((row) => row.userId === 'cam');
    expect(cam).toMatchObject({ isPending: true, score: 0 });
    expect(created.match.standings.find((row) => row.userId === host.id)).toMatchObject({
      isPending: false,
    });
  });

  it('tells the people it seated, and nobody else', async () => {
    const prisma = createPrismaMock();
    prisma.crew.findUnique.mockResolvedValue({
      id: 'crew-1',
      ownerUserId: host.id,
      name: 'Cam',
      ownerUser: userWithProfile(host.id, 'Ada'),
      members: [{ userId: 'cam', leftAt: null, user: userWithProfile('cam', 'Cam') }],
    });
    const notifier = createNotifierSpy();
    const service = createService(prisma, notifier);

    await service.create(host, {
      window: 'week',
      metric: 'pushups',
      scoringMode: 'best_single',
      dailyScope: 'any_challenge',
      crewId: 'crew-1',
    });

    // The host set it up; only the seated member is told.
    expect(notifier.notifySeated).toHaveBeenCalledWith('m1', ['cam']);
  });

  it('still creates the contest when the push fails', async () => {
    const prisma = createPrismaMock();
    prisma.crew.findUnique.mockResolvedValue({
      id: 'crew-1',
      ownerUserId: host.id,
      name: 'Cam',
      ownerUser: userWithProfile(host.id, 'Ada'),
      members: [{ userId: 'cam', leftAt: null, user: userWithProfile('cam', 'Cam') }],
    });
    const notifier = createNotifierSpy();
    notifier.notifySeated.mockRejectedValue(new Error('expo is down'));
    const service = createService(prisma, notifier);

    const created = await service.create(host, {
      window: 'week',
      metric: 'pushups',
      scoringMode: 'best_single',
      dailyScope: 'any_challenge',
      crewId: 'crew-1',
    });

    expect(created.match.id).toBe('m1');
  });

  it('accepts a pending seat when the member opens the contest', async () => {
    const prisma = createPrismaMock(
      twoPersonMatch({
        participants: [
          {
            id: 'p1',
            matchId: 'm1',
            userId: host.id,
            joinedAt: new Date(),
            acceptedAt: new Date(),
            user: userWithProfile(host.id, 'Ada'),
          },
          {
            id: 'p2',
            matchId: 'm1',
            userId: guest.id,
            joinedAt: new Date(),
            acceptedAt: null,
            user: userWithProfile(guest.id, 'Bee'),
          },
        ],
      }),
    );
    const inviteAccepted = createInviteAcceptedSpy();
    const service = createService(
      prisma,
      createNotifierSpy(),
      createAnalyticsSpy(),
      inviteAccepted,
    );

    const board = await service.get(guest, 'm1');

    expect(board.standings.find((row) => row.userId === guest.id)).toMatchObject({
      isPending: false,
    });
    expect(inviteAccepted.notifyHost).toHaveBeenCalledWith({
      matchId: 'm1',
      hostUserId: host.id,
      acceptedUserId: guest.id,
      acceptedDisplayName: 'Bee',
    });
  });

  it('offers the crew only once a contest with other people has ended', async () => {
    const live = createService(createPrismaMock(twoPersonMatch()));
    expect((await live.get(host, 'm1')).canSaveCrew).toBe(false);

    const ended = createService(createPrismaMock(twoPersonMatch({ status: 'completed' })));
    expect((await ended.get(host, 'm1')).canSaveCrew).toBe(true);

    // A contest seated from a crew already has that roster saved.
    const fromCrew = createService(
      createPrismaMock(twoPersonMatch({ status: 'completed', crewId: 'crew-1' })),
    );
    expect((await fromCrew.get(host, 'm1')).canSaveCrew).toBe(false);
  });

  it('scores a consistency contest from finished daily occurrences', async () => {
    const prisma = createPrismaMock(twoPersonMatch({ scoringMode: 'days_completed' }));
    prisma.userChallenge.findMany.mockResolvedValue([
      completion(host.id, '2026-09-04', '2026-09-04T08:00:00.000Z'),
      completion(host.id, '2026-09-05', '2026-09-05T08:00:00.000Z'),
      completion(guest.id, '2026-09-04', '2026-09-04T09:00:00.000Z'),
    ]);
    const service = createService(prisma);

    const board = await service.get(host, 'm1');

    expect(board.yourScore).toBe(2);
    expect(board.standings.map((row) => row.score)).toEqual([2, 1]);
  });

  // The open scope is what a streak meant before a host could narrow one, so
  // it must keep reading every daily challenge.
  it('reads any daily challenge for an open streak', async () => {
    const prisma = createPrismaMock(twoPersonMatch({ scoringMode: 'days_completed' }));
    const service = createService(prisma);

    await service.get(host, 'm1');

    expect(prisma.userChallenge.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ challenge: expect.anything() }),
      }),
    );
  });

  it('reads only the contest activity for a narrowed streak', async () => {
    const prisma = createPrismaMock(
      twoPersonMatch({
        scoringMode: 'days_completed',
        dailyScope: 'chosen_activity',
        metric: 'walk',
      }),
    );
    const service = createService(prisma);

    await service.get(host, 'm1');

    expect(prisma.userChallenge.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          challenge: { deviceMetric: 'walk' },
        }),
      }),
    );
  });

  it('stores the scope the host picked for a streak', async () => {
    const prisma = createPrismaMock();
    const service = createService(prisma);

    await service.create(host, {
      window: 'week',
      metric: 'walk',
      scoringMode: 'days_completed',
      dailyScope: 'chosen_activity',
    });

    expect(prisma.match.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ dailyScope: 'chosen_activity' }),
      }),
    );
  });

  it('reads no attempts for a consistency contest', async () => {
    const prisma = createPrismaMock(
      twoPersonMatch({
        scoringMode: 'days_completed',
        attempts: [
          {
            id: 'a1',
            matchId: 'm1',
            userId: guest.id,
            count: 90,
            durationSeconds: 60,
            source: 'in_app_pose',
            recordedAt: new Date('2026-09-04T10:00:00.000Z'),
          },
        ],
      }),
    );
    const service = createService(prisma);

    const board = await service.get(host, 'm1');

    expect(board.standings.every((row) => row.score === 0)).toBe(true);
  });

  it('counts every set for a cumulative contest', async () => {
    const prisma = createPrismaMock(
      twoPersonMatch({
        scoringMode: 'cumulative_total',
        attempts: [
          {
            id: 'a1',
            matchId: 'm1',
            userId: host.id,
            count: 20,
            durationSeconds: 60,
            source: 'in_app_pose',
            recordedAt: new Date('2026-09-04T10:00:00.000Z'),
          },
          {
            id: 'a2',
            matchId: 'm1',
            userId: host.id,
            count: 15,
            durationSeconds: 60,
            source: 'in_app_pose',
            recordedAt: new Date('2026-09-05T10:00:00.000Z'),
          },
        ],
      }),
    );
    const service = createService(prisma);

    const board = await service.get(host, 'm1');

    expect(board.yourScore).toBe(35);
  });

  // Nobody should have to walk twice: the daily walk challenge and a workout
  // from the health app are the same minutes the contest is asking for.
  it('scores walks the member logged outside the contest', async () => {
    const prisma = createPrismaMock(
      twoPersonMatch({ metric: 'walk', scoringMode: 'cumulative_total' }),
    );
    prisma.deviceActivityLog.findMany.mockResolvedValue([
      walkLog(host.id, 15 * 60),
      // Under a minute, which the board counts in whole minutes.
      walkLog(host.id, 40),
    ]);
    const service = createService(prisma);

    const board = await service.get(host, 'm1');

    expect(board.yourScore).toBe(15);
  });

  it('never scores a walk somebody confirmed by hand', async () => {
    const prisma = createPrismaMock(
      twoPersonMatch({ metric: 'walk', scoringMode: 'cumulative_total' }),
    );
    const service = createService(prisma);

    await service.get(host, 'm1');

    expect(walkQueryWhere(prisma).source.in).not.toContain('manual');
  });

  it('reads no activity for a member who has not accepted', async () => {
    const seated = twoPersonMatch({
      metric: 'walk',
      scoringMode: 'cumulative_total',
      dailyScope: 'any_challenge',
    });
    const guestSeat = seated.participants[1];
    if (!guestSeat) {
      throw new Error('expected a guest seat');
    }
    seated.participants[1] = { ...guestSeat, acceptedAt: null };
    const prisma = createPrismaMock(seated);
    const service = createService(prisma);

    await service.get(host, 'm1');

    expect(walkQueryWhere(prisma).userId.in).toEqual([host.id]);
  });

  it('leaves a push-up contest scored by its own sets alone', async () => {
    const prisma = createPrismaMock(twoPersonMatch({ scoringMode: 'cumulative_total' }));
    const service = createService(prisma);

    await service.get(host, 'm1');

    expect(prisma.deviceActivityLog.findMany).not.toHaveBeenCalled();
  });
});
