import { ORPCError } from '@orpc/server';
import { describe, expect, it, vi } from 'vitest';
import { readEnvironment } from '../../shared-modules/config/index.js';
import { CrewsService } from '../crews/index.js';
import {
  MATCH_COUNT_TOO_LARGE,
  MATCH_ENDED,
  MATCH_FULL,
  MATCH_HOST_CANNOT_LEAVE,
  MATCH_NOT_HOST,
  MATCH_NOT_OPEN,
  MATCH_REACTION_NOT_ALLOWED,
  MATCH_WRONG_ACTIVITY,
} from './errors/match.errors.js';
import { MatchReactionsService } from './match-reactions.service.js';
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

function userWithProfile(userId: string, displayName: string, image: string | null = null) {
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
  title: string | null;
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
    title: null,
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
      findMany: vi.fn().mockResolvedValue([]),
    },
    crewMember: {
      findMany: vi.fn().mockResolvedValue([]),
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
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    matchReaction: {
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
      findMany: vi.fn().mockResolvedValue([]),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
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
    $transaction: vi.fn(
      async (work: ((tx: typeof prisma) => Promise<unknown>) | Promise<unknown>[]) =>
        Array.isArray(work) ? Promise.all(work) : work(prisma),
    ),
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

function createReactionNotifierSpy() {
  return { notify: vi.fn().mockResolvedValue(undefined) };
}

function createAnalyticsSpy() {
  return { track: vi.fn().mockResolvedValue({ ok: true as const }) };
}

function createStreakSpy() {
  return {
    recordActiveDay: vi.fn(async () => ({ currentStreakDays: 3, advanced: true })),
    announceMilestone: vi.fn(async () => undefined),
  };
}

function createMatchSettledSpy() {
  return { notifyParticipants: vi.fn().mockResolvedValue(undefined) };
}

function createService(
  prisma: ReturnType<typeof createPrismaMock>,
  notifier: ReturnType<typeof createNotifierSpy> = createNotifierSpy(),
  analytics: ReturnType<typeof createAnalyticsSpy> = createAnalyticsSpy(),
  inviteAccepted: ReturnType<typeof createInviteAcceptedSpy> = createInviteAcceptedSpy(),
  boardMove: ReturnType<typeof createBoardMoveSpy> = createBoardMoveSpy(),
  reactionNotifier: ReturnType<typeof createReactionNotifierSpy> = createReactionNotifierSpy(),
  streak: ReturnType<typeof createStreakSpy> = createStreakSpy(),
  matchSettled: ReturnType<typeof createMatchSettledSpy> = createMatchSettledSpy(),
): MatchesService {
  return new MatchesService(
    prisma as never,
    readEnvironment({ WEBSITE_URL: websiteUrl }),
    new CrewsService(prisma as never),
    notifier as never,
    analytics as never,
    inviteAccepted as never,
    boardMove as never,
    new MatchReactionsService(prisma as never),
    reactionNotifier as never,
    streak as never,
    matchSettled as never,
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

  it('link_preview does not stamp firstOpenedAt or track an open', async () => {
    const prisma = createPrismaMock();
    const analytics = createAnalyticsSpy();
    const service = createService(prisma, createNotifierSpy(), analytics);

    await expect(
      service.publicPreview('invite_token_1', 'link_preview'),
    ).resolves.toMatchObject({
      token: 'invite_token_1',
      status: 'open',
    });

    expect(prisma.match.updateMany).not.toHaveBeenCalled();
    expect(analytics.track).not.toHaveBeenCalled();
  });

  it('public preview carries the host photo and the host-written title', async () => {
    const service = createService(
      createPrismaMock(
        loadedMatch({
          title: '  Push-up Sunday ',
          hostUser: userWithProfile(host.id, 'Ada', 'data:image/jpeg;base64,ada'),
        }),
      ),
    );

    await expect(service.publicPreview('invite_token_1', 'link_preview')).resolves.toMatchObject({
      hostImage: 'data:image/jpeg;base64,ada',
      title: 'Push-up Sunday',
    });
  });

  it('public preview never derives a title from the other participants', async () => {
    const service = createService(createPrismaMock(loadedMatch({ title: null })));

    await expect(service.publicPreview('invite_token_1', 'link_preview')).resolves.toMatchObject({
      hostImage: null,
      title: null,
    });
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

  it('notifies accepted members once when this call settles the contest', async () => {
    const match = loadedMatch({
      title: 'Push-up Sunday',
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
        {
          id: 'p3',
          matchId: 'm1',
          userId: 'pending',
          joinedAt: new Date(),
          acceptedAt: null,
          user: userWithProfile('pending', 'Cam'),
        },
      ],
      attempts: [
        {
          id: 'a1',
          matchId: 'm1',
          userId: host.id,
          count: 30,
          durationSeconds: 40,
          source: 'in_app_pose',
          recordedAt: new Date('2019-12-31T12:00:00.000Z'),
        },
      ],
    });
    const prisma = createPrismaMock(match);
    const matchSettled = createMatchSettledSpy();
    const service = createService(
      prisma,
      createNotifierSpy(),
      createAnalyticsSpy(),
      createInviteAcceptedSpy(),
      createBoardMoveSpy(),
      createReactionNotifierSpy(),
      createStreakSpy(),
      matchSettled,
    );

    await service.get(host, 'm1');
    await service.get(host, 'm1');

    expect(matchSettled.notifyParticipants).toHaveBeenCalledTimes(1);
    expect(matchSettled.notifyParticipants).toHaveBeenCalledWith({
      matchId: 'm1',
      contestTitle: 'Push-up Sunday',
      winnerUserId: host.id,
      winnerDisplayName: 'Ada',
      recipientUserIds: [host.id, guest.id],
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
      endsAt: board.endsAt,
      recipients: [{ userId: host.id, score: 0 }],
    });
  });

  it('counts a contest set toward the member streak', async () => {
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
    const streak = createStreakSpy();
    const service = createService(
      prisma,
      createNotifierSpy(),
      createAnalyticsSpy(),
      createInviteAcceptedSpy(),
      createBoardMoveSpy(),
      createReactionNotifierSpy(),
      streak,
    );

    await service.submitAttempt(guest, {
      matchId: 'm1',
      count: 18,
      durationSeconds: 40,
      source: 'in_app_pose',
    });

    expect(streak.recordActiveDay).toHaveBeenCalledWith(guest.id, prisma);
    expect(streak.announceMilestone).toHaveBeenCalledWith(guest.id, {
      currentStreakDays: 3,
      advanced: true,
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

  it('lists the roster and the latest move by someone else', async () => {
    const movedAt = new Date();
    const prisma = createPrismaMock(
      twoPersonMatch({
        attempts: [
          {
            id: 'a-guest',
            matchId: 'm1',
            userId: guest.id,
            count: 20,
            durationSeconds: 60,
            source: 'in_app_pose',
            recordedAt: movedAt,
          },
        ],
      }),
    );
    const service = createService(prisma);

    const hostList = await service.listMine(host);
    const guestList = await service.listMine(guest);

    expect(hostList.live[0]).toMatchObject({
      roster: [
        { displayName: 'Bee', score: 20, rank: 1, isYou: false },
        { displayName: 'Ada', score: 0, rank: 2, isYou: true },
      ],
      lastMove: { displayName: 'Bee', image: null, movedAt: movedAt.toISOString() },
    });
    expect(guestList.live[0]?.lastMove).toBeNull();
  });

  describe('today and reactions', () => {
    function guestScoredToday() {
      return twoPersonMatch({
        attempts: [
          {
            id: 'a-guest',
            matchId: 'm1',
            userId: guest.id,
            count: 12,
            durationSeconds: 40,
            source: 'in_app_pose',
            recordedAt: new Date(),
          },
        ],
      });
    }

    it('lights whoever moved the board today, and nobody else', async () => {
      const service = createService(createPrismaMock(guestScoredToday()));

      const board = await service.get(host, 'm1');

      expect(board.standings.find((row) => row.userId === guest.id)?.doneToday).toBe(true);
      expect(board.standings.find((row) => row.userId === host.id)?.doneToday).toBe(false);
    });

    it('cheers someone done today, and pushes only for the first tap', async () => {
      const prisma = createPrismaMock(guestScoredToday());
      const reactionNotifier = createReactionNotifierSpy();
      const service = createService(
        prisma,
        undefined,
        undefined,
        undefined,
        undefined,
        reactionNotifier,
      );
      const cheer = { matchId: 'm1', toUserId: guest.id, kind: 'cheer' as const };

      await service.react(host, cheer);
      prisma.matchReaction.createMany.mockResolvedValueOnce({ count: 0 });
      await service.react(host, cheer);

      expect(prisma.matchReaction.createMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({ fromUserId: host.id, toUserId: guest.id, kind: 'cheer' })],
        skipDuplicates: true,
      });
      expect(reactionNotifier.notify).toHaveBeenCalledTimes(1);
      expect(reactionNotifier.notify).toHaveBeenCalledWith(
        expect.objectContaining({ senderName: 'Ada', kind: 'cheer', toUserId: guest.id }),
      );
    });

    it('refuses a tap that does not fit the member', async () => {
      const service = createService(createPrismaMock(guestScoredToday()));

      await expect(
        service.react(host, { matchId: 'm1', toUserId: guest.id, kind: 'nudge' }),
      ).rejects.toMatchObject({ message: MATCH_REACTION_NOT_ALLOWED });
      await expect(
        service.react(guest, { matchId: 'm1', toUserId: host.id, kind: 'cheer' }),
      ).rejects.toMatchObject({ message: MATCH_REACTION_NOT_ALLOWED });
      await expect(
        service.react(host, { matchId: 'm1', toUserId: host.id, kind: 'nudge' }),
      ).rejects.toMatchObject({ message: MATCH_REACTION_NOT_ALLOWED });
    });

    it('never lets anyone nudge a seat that has not accepted', async () => {
      const match = twoPersonMatch();
      const pendingGuest = { ...match.participants[1]!, acceptedAt: null };
      const prisma = createPrismaMock({
        ...match,
        participants: [match.participants[0]!, pendingGuest],
      });
      const service = createService(prisma);

      await expect(
        service.react(host, { matchId: 'm1', toUserId: guest.id, kind: 'nudge' }),
      ).rejects.toMatchObject({ message: MATCH_REACTION_NOT_ALLOWED });
      expect(prisma.matchReaction.createMany).not.toHaveBeenCalled();
    });

    it('shows the viewer what they already sent today', async () => {
      const prisma = createPrismaMock(twoPersonMatch());
      const sentAt = new Date();
      prisma.matchReaction.findMany.mockResolvedValue([
        { toUserId: guest.id, kind: 'nudge', createdAt: sentAt },
      ]);
      const service = createService(prisma);

      const board = await service.get(host, 'm1');

      expect(board.standings.find((row) => row.userId === guest.id)?.yourReactionsToday).toEqual([
        { kind: 'nudge', sentAt: sentAt.toISOString() },
      ]);
      expect(board.standings.find((row) => row.isYou)?.yourReactionsToday).toEqual([]);
    });

    it('still lets a cheer follow a morning nudge once they are done', async () => {
      const prisma = createPrismaMock(guestScoredToday());
      const reactionNotifier = createReactionNotifierSpy();
      const service = createService(
        prisma,
        undefined,
        undefined,
        undefined,
        undefined,
        reactionNotifier,
      );
      prisma.matchReaction.findMany.mockResolvedValue([
        { toUserId: guest.id, kind: 'nudge', createdAt: new Date() },
      ]);

      await service.react(host, { matchId: 'm1', toUserId: guest.id, kind: 'cheer' });

      expect(prisma.matchReaction.createMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({ kind: 'cheer' })],
        skipDuplicates: true,
      });
      expect(reactionNotifier.notify).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'cheer' }),
      );
    });

    it('lists every member with their today flag for the Groups faces', async () => {
      const service = createService(createPrismaMock(guestScoredToday()));

      const list = await service.listMine(host);

      expect(list.live[0]?.standings?.map((row) => [row.userId, row.doneToday])).toEqual([
        [guest.id, true],
        [host.id, false],
      ]);
    });
  });

  describe('day squares', () => {
    it('sends a short streak board its days and which ones each member moved', async () => {
      const startsAt = new Date(Date.now() - 2 * 86_400_000);
      const prisma = createPrismaMock(
        twoPersonMatch({
          scoringMode: 'days_completed',
          startsAt,
          endsAt: new Date(startsAt.getTime() + 7 * 86_400_000),
        }),
      );
      const todayKey = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' });
      prisma.userChallenge.findMany.mockResolvedValue([
        completion(guest.id, todayKey, new Date().toISOString()),
      ]);
      const service = createService(prisma);

      const board = await service.get(host, 'm1');

      expect(board.dayStrip?.dayKeys.length).toBeGreaterThanOrEqual(7);
      expect(board.dayStrip?.todayKey).toBe(todayKey);
      expect(board.standings.find((row) => row.userId === guest.id)?.movedDayKeys).toEqual([
        todayKey,
      ]);
      expect(board.standings.find((row) => row.isYou)?.movedDayKeys).toEqual([]);
      expect(prisma.userChallenge.findMany).toHaveBeenCalledTimes(1);
    });

    it('draws no squares for any other way to win', async () => {
      const service = createService(createPrismaMock(twoPersonMatch()));

      const board = await service.get(host, 'm1');

      expect(board.dayStrip).toBeNull();
      expect(board.standings[0]).not.toHaveProperty('movedDayKeys');
    });
  });

  describe('leave', () => {
    it('steps a member out with their sets and taps', async () => {
      const prisma = createPrismaMock(twoPersonMatch());
      const service = createService(prisma);

      await service.leave(guest, 'm1');

      expect(prisma.matchAttempt.deleteMany).toHaveBeenCalledWith({
        where: { matchId: 'm1', userId: guest.id },
      });
      expect(prisma.matchParticipant.deleteMany).toHaveBeenCalledWith({
        where: { matchId: 'm1', userId: guest.id },
      });
      expect(prisma.matchReaction.deleteMany).toHaveBeenCalledWith({
        where: { matchId: 'm1', OR: [{ fromUserId: guest.id }, { toUserId: guest.id }] },
      });
    });

    it('keeps the host, who cancels instead', async () => {
      const service = createService(createPrismaMock(twoPersonMatch()));

      await expect(service.leave(host, 'm1')).rejects.toMatchObject({
        message: MATCH_HOST_CANNOT_LEAVE,
      });
    });
  });

  it('shows the host photo on the signed-in invite preview', async () => {
    const service = createService(
      createPrismaMock(
        loadedMatch({ hostUser: userWithProfile(host.id, 'Ada', 'https://cdn.example/ada.jpg') }),
      ),
    );

    const preview = await service.preview(guest, 'invite_token_1');

    expect(preview.hostImage).toBe('https://cdn.example/ada.jpg');
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

  it('seats selected acquaintances pending and keeps the invite link', async () => {
    const prisma = createPrismaMock();
    prisma.matchParticipant.findMany
      .mockResolvedValueOnce([{ matchId: 'm1' }])
      .mockResolvedValueOnce([
        {
          userId: 'cam',
          joinedAt: new Date(),
          user: userWithProfile('cam', 'Cam'),
        },
      ]);
    const notifier = createNotifierSpy();
    const service = createService(prisma, notifier);

    const created = await service.create(host, {
      window: 'week',
      metric: 'pushups',
      scoringMode: 'best_single',
      dailyScope: 'any_challenge',
      participantUserIds: ['cam'],
    });

    expect(prisma.matchParticipant.createMany).toHaveBeenCalledWith({
      data: [{ matchId: 'm1', userId: 'cam', acceptedAt: null }],
    });
    expect(notifier.notifySeated).toHaveBeenCalledWith(
      expect.objectContaining({ matchId: 'm1', userIds: ['cam'] }),
    );
    expect(created.invite.url).toContain('/match/');
  });

  it('rejects seating a stranger who was never in a contest with the host', async () => {
    const prisma = createPrismaMock();
    prisma.matchParticipant.findMany.mockResolvedValue([]);
    const service = createService(prisma);

    await expect(
      service.create(host, {
        window: 'week',
        metric: 'pushups',
        scoringMode: 'best_single',
        dailyScope: 'any_challenge',
        participantUserIds: ['stranger'],
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('uses a host title on the board when provided', async () => {
    const prisma = createPrismaMock(loadedMatch({ title: 'Acme March challenge' }));
    prisma.match.create.mockImplementation(async ({ data }: { data: { title?: string | null } }) => {
      prisma.current.match = { ...prisma.current.match, title: data.title ?? null };
      return { id: 'm1', inviteToken: 'invite_token_1' };
    });
    const service = createService(prisma);

    const created = await service.create(host, {
      window: 'week',
      metric: 'pushups',
      scoringMode: 'best_single',
      dailyScope: 'any_challenge',
      title: 'Acme March challenge',
    });

    expect(created.match.title).toBe('Acme March challenge');
    expect(created.match.hostTitle).toBe('Acme March challenge');
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
    expect(notifier.notifySeated).toHaveBeenCalledWith(
      expect.objectContaining({ matchId: 'm1', userIds: ['cam'] }),
    );
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
