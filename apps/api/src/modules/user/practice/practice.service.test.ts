import { ORPCError } from '@orpc/server';
import { describe, expect, it, vi } from 'vitest';
import { PracticeService } from './practice.service.js';

const user = { id: 'u1', email: 'ada@example.com', name: 'Ada' };

const TIME_ZONE = 'Asia/Singapore';

function localDayKey(at: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
}

/** Midday local time today, so the fixture never straddles a day boundary. */
function todayAt(hour: number): Date {
  const now = new Date();
  const [year = 0, month = 0, day = 0] = localDayKey(now).split('-').map(Number);

  // Singapore is UTC+8 with no DST, so subtracting the offset is exact.
  return new Date(Date.UTC(year, month - 1, day, hour - 8));
}

type PracticeRow = {
  id: string;
  metric: string;
  count: number | null;
  durationSeconds: number | null;
  createdAt: Date;
};

type FindFirstArgs = { where: Record<string, unknown> };

type UpsertArgs = {
  where: { userId_externalId: { userId: string; externalId: string } };
  create: Record<string, unknown>;
  update: Record<string, unknown>;
};

type StoredSession = {
  userChallengeId: string | null;
  count: number | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
  endedAt: Date | null;
};

function createPrismaMock(
  options: {
    unlockedChallenge?: { id: string } | null;
    membershipActive?: boolean;
    existing?: PracticeRow[];
    stored?: StoredSession | null;
  } = {},
) {
  const rows = options.existing ?? [];
  // `??` would swallow an explicit null, which is the locked-out case.
  const unlocked = 'unlockedChallenge' in options ? options.unlockedChallenge : { id: 'c-push' };

  return {
    challenge: {
      findFirst: vi.fn(async (_args: FindFirstArgs) => unlocked),
    },
    userProfile: {
      findUnique: vi.fn(async () => ({
        membershipActive: options.membershipActive ?? true,
        timeZone: TIME_ZONE,
      })),
    },
    deviceActivityLog: {
      findUnique: vi.fn(async () =>
        options.stored
          ? { id: 'log-1', metric: 'walk', createdAt: todayAt(12), ...options.stored }
          : null,
      ),
      upsert: vi.fn(async ({ create }: UpsertArgs) => ({
        id: 'log-1',
        metric: create.metric,
        count: create.count,
        durationSeconds: create.durationSeconds,
        createdAt: todayAt(12),
      })),
      findMany: vi.fn(async () => rows),
    },
    proofClip: {
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
  };
}

function createStreakSpy() {
  return {
    recordActiveDay: vi.fn(async () => ({ currentStreakDays: 1, advanced: true })),
    announceMilestone: vi.fn(async () => undefined),
  };
}

function createMatchesSpy(creditedMatchIds: string[] = []) {
  return {
    creditPosePractice: vi.fn(async () => creditedMatchIds),
  };
}

function createChallengesSpy() {
  return {
    creditMeasuredActivity: vi.fn(async () => [] as string[]),
  };
}

function createService(
  prisma: ReturnType<typeof createPrismaMock>,
  streak: ReturnType<typeof createStreakSpy> = createStreakSpy(),
  matches: ReturnType<typeof createMatchesSpy> = createMatchesSpy(),
  challenges: ReturnType<typeof createChallengesSpy> = createChallengesSpy(),
): PracticeService {
  return new PracticeService(prisma as never, streak as never, matches as never, challenges as never);
}

const input = {
  metric: 'pushups',
  source: 'in_app_pose',
  count: 12,
  durationSeconds: 65,
  startedAt: '2026-09-22T09:00:00.000Z',
  endedAt: '2026-09-22T09:01:05.000Z',
  externalId: 'session-abc',
} as const;

const walk = {
  metric: 'walk',
  source: 'in_app_gps',
  durationSeconds: 252,
  distanceMeters: 380,
  startedAt: '2026-09-22T09:00:00.000Z',
  endedAt: '2026-09-22T09:04:12.000Z',
  externalId: 'in-app-gps:uc-walk:2026-09-22T09:00:00.000Z',
} as const;

describe('PracticeService.record', () => {
  it('rejects unauthenticated callers', async () => {
    const service = createService(createPrismaMock());

    await expect(service.record(null, input)).rejects.toBeInstanceOf(ORPCError);
  });

  it('refuses a metric no accessible challenge tracks', async () => {
    const prisma = createPrismaMock({
      unlockedChallenge: null,
      membershipActive: false,
    });
    const service = createService(prisma);

    await expect(service.record(user, input)).rejects.toBeInstanceOf(ORPCError);
    expect(prisma.deviceActivityLog.upsert).not.toHaveBeenCalled();
  });

  it('narrows the unlock lookup to free challenges without a membership', async () => {
    const prisma = createPrismaMock({ membershipActive: false });
    await createService(prisma).record(user, input);

    expect(prisma.challenge.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ requiresMembership: false }),
      }),
    );
  });

  it('leaves the unlock lookup open for a member', async () => {
    const prisma = createPrismaMock({ membershipActive: true });
    await createService(prisma).record(user, input);

    const where = prisma.challenge.findFirst.mock.calls[0]?.[0]?.where ?? {};
    expect(where).not.toHaveProperty('requiresMembership');
  });

  it('records the session against no occurrence, keyed for safe retries', async () => {
    const prisma = createPrismaMock();
    const result = await createService(prisma).record(user, input);

    const call = prisma.deviceActivityLog.upsert.mock.calls[0]?.[0];
    expect(call?.where).toEqual({
      userId_externalId: { userId: 'u1', externalId: 'session-abc' },
    });
    // A retry writes the same measurement onto the same row, never a second set.
    expect(call?.update).toMatchObject({ count: 12, durationSeconds: 65 });
    expect(call?.create).toMatchObject({
      userId: 'u1',
      userChallengeId: null,
      count: 12,
      metric: 'pushups',
    });
    expect(result.session.count).toBe(12);
  });

  it('records a walk that fell short in time and distance, with no reps', async () => {
    const prisma = createPrismaMock();
    await createService(prisma).record(user, walk);

    expect(prisma.deviceActivityLog.upsert.mock.calls[0]?.[0]?.create).toMatchObject({
      userChallengeId: null,
      metric: 'walk',
      source: 'in_app_gps',
      count: null,
      durationSeconds: 252,
      distanceMeters: 380,
    });
  });

  it('carries a longer walk onto the same row when saved again', async () => {
    const prisma = createPrismaMock({
      stored: {
        userChallengeId: null,
        count: null,
        durationSeconds: 120,
        distanceMeters: 150,
        endedAt: null,
      },
    });
    await createService(prisma).record(user, walk);

    expect(prisma.deviceActivityLog.upsert.mock.calls[0]?.[0]?.update).toMatchObject({
      durationSeconds: 252,
      distanceMeters: 380,
    });
  });

  it('keeps the longer walk when an earlier save is retried late', async () => {
    const stored = {
      userChallengeId: null,
      count: null,
      durationSeconds: 600,
      distanceMeters: 900,
      endedAt: null,
    };
    const prisma = createPrismaMock({ stored });
    await createService(prisma).record(user, walk);

    expect(prisma.deviceActivityLog.upsert.mock.calls[0]?.[0]?.update).toMatchObject({
      durationSeconds: 600,
      distanceMeters: 900,
    });
  });

  it('leaves a session alone once a completion has claimed it', async () => {
    const prisma = createPrismaMock({
      stored: {
        userChallengeId: 'uc-walk',
        count: null,
        durationSeconds: 600,
        distanceMeters: 900,
        endedAt: null,
      },
    });
    await createService(prisma).record(user, walk);

    expect(prisma.deviceActivityLog.upsert).not.toHaveBeenCalled();
  });

  it('links the clip that filmed the set, only if it is still unclaimed and live', async () => {
    const prisma = createPrismaMock();
    await createService(prisma).record(user, { ...input, proofClipId: 'clip-1' });

    expect(prisma.proofClip.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'clip-1',
        userId: 'u1',
        deviceActivityLogId: null,
        status: { in: ['reserved', 'recorded', 'ready'] },
      },
      data: { deviceActivityLogId: 'log-1' },
    });
  });

  it('links no clip when the set carried none', async () => {
    const prisma = createPrismaMock();
    await createService(prisma).record(user, input);

    expect(prisma.proofClip.updateMany).not.toHaveBeenCalled();
  });

  it('links no clip to a session a completion has claimed', async () => {
    const prisma = createPrismaMock({
      stored: {
        userChallengeId: 'uc-walk',
        count: null,
        durationSeconds: 600,
        distanceMeters: 900,
        endedAt: null,
      },
    });
    await createService(prisma).record(user, { ...walk, proofClipId: 'clip-1' });

    expect(prisma.proofClip.updateMany).not.toHaveBeenCalled();
  });

  it('awards no points and touches no ledger', async () => {
    const prisma = createPrismaMock();
    await createService(prisma).record(user, input);

    expect(prisma).not.toHaveProperty('pointLedgerEntry');
    expect(prisma.userProfile).not.toHaveProperty('update');
  });

  it('counts the day toward the streak', async () => {
    const streak = createStreakSpy();
    await createService(createPrismaMock(), streak).record(user, input);

    expect(streak.recordActiveDay).toHaveBeenCalledWith('u1');
    expect(streak.announceMilestone).toHaveBeenCalledWith('u1', {
      currentStreakDays: 1,
      advanced: true,
    });
  });

  it('credits open pose contests from a practice set', async () => {
    const matches = createMatchesSpy(['m1']);
    const result = await createService(createPrismaMock(), createStreakSpy(), matches).record(
      user,
      input,
    );

    expect(matches.creditPosePractice).toHaveBeenCalledWith(user, {
      metric: input.metric,
      count: input.count,
      durationSeconds: input.durationSeconds,
      source: input.source,
    });
    expect(result.creditedMatchIds).toEqual(['m1']);
  });

  it('applies the set toward open Mine goals before contest credit', async () => {
    const matches = createMatchesSpy(['m1']);
    const challenges = createChallengesSpy();
    await createService(createPrismaMock(), createStreakSpy(), matches, challenges).record(
      user,
      input,
    );

    expect(challenges.creditMeasuredActivity).toHaveBeenCalledWith(user, {
      metric: input.metric,
      source: input.source,
      count: input.count,
      durationSeconds: input.durationSeconds,
      distanceMeters: undefined,
      startedAt: input.startedAt,
      endedAt: input.endedAt,
      externalId: input.externalId,
    });
    expect(challenges.creditMeasuredActivity.mock.invocationCallOrder[0]).toBeLessThan(
      matches.creditPosePractice.mock.invocationCallOrder[0]!,
    );
  });

  it('records nothing toward the streak when the metric is locked', async () => {
    const streak = createStreakSpy();
    const matches = createMatchesSpy();
    const challenges = createChallengesSpy();
    const prisma = createPrismaMock({ unlockedChallenge: null, membershipActive: false });

    await expect(
      createService(prisma, streak, matches, challenges).record(user, input),
    ).rejects.toBeInstanceOf(ORPCError);
    expect(streak.recordActiveDay).not.toHaveBeenCalled();
    expect(challenges.creditMeasuredActivity).not.toHaveBeenCalled();
    expect(matches.creditPosePractice).not.toHaveBeenCalled();
  });
});

describe('PracticeService.totals', () => {
  it('sums only the sets inside the local day', async () => {
    const yesterday = new Date(todayAt(12).getTime() - 24 * 60 * 60 * 1000);
    const prisma = createPrismaMock({
      existing: [
        { id: 'a', metric: 'pushups', count: 10, durationSeconds: 60, createdAt: todayAt(7) },
        { id: 'b', metric: 'pushups', count: 14, durationSeconds: 70, createdAt: todayAt(19) },
        { id: 'c', metric: 'pushups', count: 99, durationSeconds: 60, createdAt: yesterday },
      ],
    });

    const totals = await createService(prisma).totals(user, 'pushups');

    expect(totals).toEqual({ todayCount: 24, todaySessions: 2 });
  });

  it('reads practice rows only, never challenge sessions', async () => {
    const prisma = createPrismaMock();
    await createService(prisma).totals(user, 'pushups');

    expect(prisma.deviceActivityLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userChallengeId: null, metric: 'pushups' }),
      }),
    );
  });

  it('reports an empty day as zero rather than failing', async () => {
    const prisma = createPrismaMock({ existing: [] });

    await expect(createService(prisma).totals(user, 'pushups')).resolves.toEqual({
      todayCount: 0,
      todaySessions: 0,
    });
  });
});
