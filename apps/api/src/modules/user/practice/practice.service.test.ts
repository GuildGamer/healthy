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

function createPrismaMock(options: {
  unlockedChallenge?: { id: string } | null;
  membershipActive?: boolean;
  existing?: PracticeRow[];
} = {}) {
  const rows = options.existing ?? [];
  // `??` would swallow an explicit null, which is the locked-out case.
  const unlocked =
    'unlockedChallenge' in options ? options.unlockedChallenge : { id: 'c-push' };

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
      upsert: vi.fn(async ({ create }: UpsertArgs) => ({
        id: 'log-1',
        metric: create.metric,
        count: create.count,
        durationSeconds: create.durationSeconds,
        createdAt: todayAt(12),
      })),
      findMany: vi.fn(async () => rows),
    },
  };
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

describe('PracticeService.record', () => {
  it('rejects unauthenticated callers', async () => {
    const service = new PracticeService(createPrismaMock() as never);

    await expect(service.record(null, input)).rejects.toBeInstanceOf(ORPCError);
  });

  it('refuses a metric no accessible challenge tracks', async () => {
    const prisma = createPrismaMock({
      unlockedChallenge: null,
      membershipActive: false,
    });
    const service = new PracticeService(prisma as never);

    await expect(service.record(user, input)).rejects.toBeInstanceOf(ORPCError);
    expect(prisma.deviceActivityLog.upsert).not.toHaveBeenCalled();
  });

  it('narrows the unlock lookup to free challenges without a membership', async () => {
    const prisma = createPrismaMock({ membershipActive: false });
    await new PracticeService(prisma as never).record(user, input);

    expect(prisma.challenge.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ requiresMembership: false }),
      }),
    );
  });

  it('leaves the unlock lookup open for a member', async () => {
    const prisma = createPrismaMock({ membershipActive: true });
    await new PracticeService(prisma as never).record(user, input);

    const where = prisma.challenge.findFirst.mock.calls[0]?.[0]?.where ?? {};
    expect(where).not.toHaveProperty('requiresMembership');
  });

  it('records the session against no occurrence, keyed for safe retries', async () => {
    const prisma = createPrismaMock();
    const result = await new PracticeService(prisma as never).record(user, input);

    const call = prisma.deviceActivityLog.upsert.mock.calls[0]?.[0];
    expect(call?.where).toEqual({
      userId_externalId: { userId: 'u1', externalId: 'session-abc' },
    });
    // An empty update is what makes the retry a read rather than a second set.
    expect(call?.update).toEqual({});
    expect(call?.create).toMatchObject({
      userId: 'u1',
      userChallengeId: null,
      count: 12,
      metric: 'pushups',
    });
    expect(result.session.count).toBe(12);
  });

  it('awards no points and touches no ledger or streak', async () => {
    const prisma = createPrismaMock();
    await new PracticeService(prisma as never).record(user, input);

    expect(prisma).not.toHaveProperty('pointLedgerEntry');
    expect(prisma.userProfile).not.toHaveProperty('update');
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

    const totals = await new PracticeService(prisma as never).totals(user, 'pushups');

    expect(totals).toEqual({ todayCount: 24, todaySessions: 2 });
  });

  it('reads practice rows only, never challenge sessions', async () => {
    const prisma = createPrismaMock();
    await new PracticeService(prisma as never).totals(user, 'pushups');

    expect(prisma.deviceActivityLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userChallengeId: null, metric: 'pushups' }),
      }),
    );
  });

  it('reports an empty day as zero rather than failing', async () => {
    const prisma = createPrismaMock({ existing: [] });

    await expect(
      new PracticeService(prisma as never).totals(user, 'pushups'),
    ).resolves.toEqual({ todayCount: 0, todaySessions: 0 });
  });
});
