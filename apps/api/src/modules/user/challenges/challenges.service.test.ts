import { ORPCError } from '@orpc/server';
import { DEFAULT_CHALLENGE_ICON } from '@product/contract';
import { describe, expect, it, vi } from 'vitest';
import type { PracticeService } from '../practice/index.js';
import { ChallengesService } from './challenges.service.js';

const user = { id: 'u1', email: 'a@b.co', name: 'Ada' };

const TIME_ZONE = 'Asia/Singapore';

/** Practice only feeds the activity list; every other path ignores it. */
function createService(
  prisma: unknown,
  evidenceValidator?: unknown,
  practice: Partial<PracticeService> = { listRecent: async () => [] },
  delivery?: { send: ReturnType<typeof vi.fn> },
): ChallengesService {
  return new ChallengesService(
    prisma as never,
    practice as PracticeService,
    evidenceValidator as never,
    undefined,
    delivery as never,
  );
}

function localDayKey(timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function createAssignment(overrides: Record<string, unknown> = {}) {
  const { challenge: challengeOverrides, ...rest } = overrides;
  return {
    id: 'uc1',
    userId: 'u1',
    challengeId: 'c1',
    periodKey: '2026-08-29',
    frequency: 'daily',
    status: 'pending',
    startedAt: null,
    completedAt: null,
    surpriseEvidenceRequest: null,
    enrollment: null,
    challenge: {
      title: 'Walk 20 minutes',
      description: 'A brisk walk after lunch.',
      category: 'general',
      rewardPoints: 20,
      sortOrder: 100,
      completionKind: 'check_in',
      instruction: 'Step outside and walk for twenty minutes.',
      icon: 'walk',
      surpriseEvidenceChancePercent: 0,
      surpriseEvidenceWindowSeconds: 60,
      surpriseEvidencePenaltyPoints: 25,
      ...(challengeOverrides as Record<string, unknown> | undefined),
    },
    ...rest,
  };
}

function createPrismaMock(
  assignment: ReturnType<typeof createAssignment> | null,
  membershipActive = false,
) {
  return {
    userProfile: {
      findUnique: vi.fn().mockResolvedValue({ timeZone: TIME_ZONE, membershipActive }),
    },
    userChallenge: {
      findUnique: vi.fn().mockResolvedValue(assignment),
      findUniqueOrThrow: vi.fn().mockResolvedValue(assignment),
      findMany: vi.fn().mockResolvedValue([]),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };
}

type EnrollmentFixture = {
  id: string;
  challengeId: string;
  frequency: 'daily' | 'weekly' | 'monthly';
};

function createListPrismaMock(
  enrollments: EnrollmentFixture[],
  assignments: unknown[] = [],
  membershipActive = false,
) {
  return {
    userProfile: {
      findUnique: vi
        .fn()
        .mockResolvedValue({ timeZone: TIME_ZONE, membershipActive }),
    },
    challengeEnrollment: {
      findMany: vi.fn().mockResolvedValue(enrollments),
    },
    userChallenge: {
      createMany: vi.fn().mockResolvedValue({ count: enrollments.length }),
      findMany: vi.fn().mockResolvedValue(assignments),
    },
  };
}

function createdRows(createMany: ReturnType<typeof vi.fn>) {
  const [argument] = createMany.mock.calls[0] as [
    { data: Array<{ challengeId: string; periodKey: string }> },
  ];
  return argument.data;
}

describe('ChallengesService.listToday', () => {
  it('creates one occurrence per active enrolment', async () => {
    const prisma = createListPrismaMock([
      { id: 'e1', challengeId: 'c1', frequency: 'daily' },
      { id: 'e2', challengeId: 'c2', frequency: 'daily' },
    ]);

    await createService(prisma).listToday(user);

    expect(createdRows(prisma.userChallenge.createMany)).toHaveLength(2);
  });

  it('creates nothing when the user has no enrolments', async () => {
    const prisma = createListPrismaMock([]);

    const result = await createService(prisma).listToday(user);

    expect(prisma.userChallenge.createMany).not.toHaveBeenCalled();
    expect(result.challenges).toEqual([]);
    expect(result.totalCount).toBe(0);
  });

  it('only considers enrolments that are active on both sides', async () => {
    const prisma = createListPrismaMock([]);

    await createService(prisma).listToday(user);

    const [argument] = prisma.challengeEnrollment.findMany.mock.calls[0] as [
      { where: Record<string, unknown> },
    ];
    expect(argument.where).toMatchObject({
      userId: user.id,
      isActive: true,
      challenge: { isActive: true },
    });
  });

  it('relies on the unique period key rather than overwriting progress', async () => {
    const prisma = createListPrismaMock([
      { id: 'e1', challengeId: 'c1', frequency: 'daily' },
    ]);

    await createService(prisma).listToday(user);

    const [argument] = prisma.userChallenge.createMany.mock.calls[0] as [
      { skipDuplicates: boolean },
    ];
    expect(argument.skipDuplicates).toBe(true);
  });

  it('buckets a daily occurrence by the profile time zone', async () => {
    const prisma = createListPrismaMock([
      { id: 'e1', challengeId: 'c1', frequency: 'daily' },
    ]);

    const result = await createService(prisma).listToday(user);

    expect(result.dayKey).toBe(localDayKey(TIME_ZONE));
    expect(createdRows(prisma.userChallenge.createMany)[0]?.periodKey).toBe(
      localDayKey(TIME_ZONE),
    );
  });

  it('anchors a weekly occurrence to the Monday of the local week', async () => {
    const prisma = createListPrismaMock([
      { id: 'e1', challengeId: 'c1', frequency: 'weekly' },
    ]);

    await createService(prisma).listToday(user);

    const periodKey = createdRows(prisma.userChallenge.createMany)[0]?.periodKey;
    const weekday = new Date(`${periodKey}T00:00:00.000Z`).getUTCDay();

    expect(weekday).toBe(1);
    expect(periodKey?.localeCompare(localDayKey(TIME_ZONE))).toBeLessThanOrEqual(
      0,
    );
  });

  it('anchors a monthly occurrence to the first of the local month', async () => {
    const prisma = createListPrismaMock([
      { id: 'e1', challengeId: 'c1', frequency: 'monthly' },
    ]);

    await createService(prisma).listToday(user);

    expect(createdRows(prisma.userChallenge.createMany)[0]?.periodKey).toBe(
      `${localDayKey(TIME_ZONE).slice(0, 7)}-01`,
    );
  });

  it('reads back occurrences already in progress', async () => {
    const prisma = createListPrismaMock(
      [{ id: 'e1', challengeId: 'c1', frequency: 'daily' }],
      [createAssignment({ id: 'uc-old', status: 'in_progress' })],
    );

    const result = await createService(prisma).listToday(user);

    expect(result.challenges).toHaveLength(1);
    expect(result.challenges[0]?.status).toBe('in_progress');
    expect(result.completedCount).toBe(0);
  });

  it('scopes the read to the open period of each cadence', async () => {
    const prisma = createListPrismaMock([]);

    await createService(prisma).listToday(user);

    const [argument] = prisma.userChallenge.findMany.mock.calls.at(-1) as [
      { where: { OR: Array<{ frequency: string }> } },
    ];
    expect(argument.where.OR.map((clause) => clause.frequency)).toEqual([
      'daily',
      'weekly',
      'monthly',
    ]);
  });

  it('never materialises a membership challenge for a lapsed member', async () => {
    const prisma = createListPrismaMock([]);

    await createService(prisma).listToday(user);

    const [argument] = prisma.challengeEnrollment.findMany.mock.calls[0] as [
      { where: { challenge: Record<string, unknown> } },
    ];
    expect(argument.where.challenge).toMatchObject({
      isActive: true,
      requiresMembership: false,
    });
  });

  it('hides occurrences of membership challenges from a lapsed member', async () => {
    const prisma = createListPrismaMock([]);

    await createService(prisma).listToday(user);

    const [argument] = prisma.userChallenge.findMany.mock.calls.at(-1) as [
      { where: { challenge: Record<string, unknown> } },
    ];
    expect(argument.where.challenge).toEqual({ requiresMembership: false });
  });

  it('leaves membership challenges in place for an active member', async () => {
    const prisma = createListPrismaMock([], [], true);

    await createService(prisma).listToday(user);

    const [enrollmentArgument] = prisma.challengeEnrollment.findMany.mock
      .calls[0] as [{ where: { challenge: Record<string, unknown> } }];
    const [readArgument] = prisma.userChallenge.findMany.mock.calls.at(-1) as [
      { where: { challenge: Record<string, unknown> } },
    ];

    expect(enrollmentArgument.where.challenge).toEqual({ isActive: true });
    expect(readArgument.where.challenge).toEqual({});
  });
});

describe('membership access to an occurrence already on the board', () => {
  function paidAssignment() {
    return createAssignment({
      status: 'in_progress',
      challenge: {
        ...createAssignment().challenge,
        requiresMembership: true,
      },
    });
  }

  it('blocks starting a membership challenge once the membership lapses', async () => {
    const prisma = createPrismaMock(paidAssignment());
    const service = createService(prisma);

    await expect(service.start(user, 'uc1')).rejects.toMatchObject({
      code: 'FORBIDDEN',
      data: { reason: 'membership_required' },
    });
    expect(prisma.userChallenge.updateMany).not.toHaveBeenCalled();
  });

  it('blocks completing a membership challenge once the membership lapses', async () => {
    const prisma = createPrismaMock(paidAssignment());
    const service = createService(prisma);

    await expect(service.complete(user, 'uc1')).rejects.toMatchObject({
      code: 'FORBIDDEN',
      data: { reason: 'membership_required' },
    });
    expect(prisma.userChallenge.updateMany).not.toHaveBeenCalled();
  });

  it('lets an active member start the same challenge', async () => {
    const prisma = createPrismaMock(paidAssignment(), true);
    const service = createService(prisma);

    await expect(service.start(user, 'uc1')).resolves.toMatchObject({
      challenge: { id: 'uc1' },
    });
  });

  it('spares free challenges the membership lookup entirely', async () => {
    const prisma = createPrismaMock(createAssignment({ status: 'in_progress' }));

    await createService(prisma).start(user, 'uc1');

    expect(prisma.userProfile.findUnique).not.toHaveBeenCalled();
  });
});

describe('ChallengesService.start', () => {
  it('rejects unauthenticated callers with ORPC UNAUTHORIZED', async () => {
    const service = createService(createPrismaMock(null));

    await expect(service.start(null, 'uc1')).rejects.toBeInstanceOf(ORPCError);
  });

  it('rejects an assignment belonging to another user', async () => {
    const prisma = createPrismaMock(
      createAssignment({ userId: 'someone-else' }),
    );
    const service = createService(prisma);

    await expect(service.start(user, 'uc1')).rejects.toBeInstanceOf(ORPCError);
    expect(prisma.userChallenge.updateMany).not.toHaveBeenCalled();
  });

  it('moves a pending assignment to in_progress', async () => {
    const prisma = createPrismaMock(createAssignment());
    prisma.userChallenge.findUniqueOrThrow.mockResolvedValue(
      createAssignment({ status: 'in_progress', startedAt: new Date() }),
    );
    const service = createService(prisma);

    const result = await service.start(user, 'uc1');

    expect(result.challenge).toMatchObject({
      id: 'uc1',
      title: 'Walk 20 minutes',
      rewardPoints: 20,
      status: 'in_progress',
      frequency: 'daily',
      icon: 'walk',
    });
    expect(prisma.userChallenge.updateMany).toHaveBeenCalledWith({
      where: { id: 'uc1', status: 'pending' },
      data: { status: 'in_progress', startedAt: expect.any(Date) },
    });
  });

  it('is a no-op for an already completed assignment', async () => {
    const completed = createAssignment({
      status: 'completed',
      completedAt: new Date(),
    });
    const prisma = createPrismaMock(completed);
    prisma.userChallenge.updateMany.mockResolvedValue({ count: 0 });
    const service = createService(prisma);

    const result = await service.start(user, 'uc1');

    expect(result.challenge.status).toBe('completed');
  });

  it('falls back when the catalog icon is empty', async () => {
    const prisma = createPrismaMock(
      createAssignment({
        challenge: { icon: '' },
      }),
    );
    prisma.userChallenge.findUniqueOrThrow.mockResolvedValue(
      createAssignment({
        status: 'in_progress',
        startedAt: new Date(),
        challenge: { icon: '' },
      }),
    );
    const service = createService(prisma);

    const result = await service.start(user, 'uc1');

    expect(result.challenge.icon).toBe(DEFAULT_CHALLENGE_ICON);
  });
});

describe('ChallengesService.complete', () => {
  it('rejects a blood-pressure challenge that has no reading yet', async () => {
    const assignment = createAssignment({
      status: 'in_progress',
      challenge: {
        ...createAssignment().challenge,
        completionKind: 'vitals_bp',
      },
    });
    const prisma = createPrismaMock(assignment);
    const service = createService(prisma);

    await expect(service.complete(user, 'uc1')).rejects.toBeInstanceOf(
      ORPCError,
    );
    expect(prisma.userChallenge.updateMany).not.toHaveBeenCalled();
  });

  it('rejects a gym challenge that has no photo yet', async () => {
    const assignment = createAssignment({
      status: 'in_progress',
      challenge: {
        ...createAssignment().challenge,
        completionKind: 'evidence_photo',
      },
    });
    const prisma = createPrismaMock(assignment);
    const service = createService(prisma);

    await expect(service.complete(user, 'uc1')).rejects.toBeInstanceOf(
      ORPCError,
    );
  });

  it('rejects a gym photo the validator does not accept', async () => {
    const assignment = createAssignment({
      status: 'in_progress',
      challenge: {
        ...createAssignment().challenge,
        completionKind: 'evidence_photo',
      },
    });
    const prisma = createPrismaMock(assignment);
    const service = createService(prisma, {
      validateGymPhoto: async () => ({
        accepted: false,
        reason: 'That photo does not look like a gym session.',
      }),
      validatePhoto: async () => ({ accepted: true }),
    });

    await expect(
      service.complete(user, 'uc1', undefined, {
        mimeType: 'image/jpeg',
        imageBase64: 'a'.repeat(32),
      }),
    ).rejects.toBeInstanceOf(ORPCError);
  });

  it('rejects a sleep entry on a challenge that is not about sleep', async () => {
    const prisma = createPrismaMock(createAssignment({ status: 'in_progress' }));
    const service = createService(prisma);

    await expect(
      service.complete(user, 'uc1', undefined, undefined, {
        sleep: {
          wentToBedAt: '2026-10-22T23:00:00+01:00',
          wokeUpAt: '2026-10-23T07:00:00+01:00',
        },
      }),
    ).rejects.toBeInstanceOf(ORPCError);
  });

  it('lets an older app finish a sleep challenge without a sleep entry', async () => {
    const assignment = sleepAssignment();
    const { prisma, challengeLogUpsert } = createCompletePrismaMock(assignment);
    const service = createService(prisma);

    await expect(service.complete(user, 'uc1')).resolves.toMatchObject({
      pointsAwarded: 20,
    });
    expect(challengeLogUpsert).not.toHaveBeenCalled();
  });

  it('does not fail the completion when the push delivery throws', async () => {
    const assignment = sleepAssignment();
    const { prisma } = createCompletePrismaMock(assignment);
    const delivery = {
      send: vi.fn().mockRejectedValue(new Error('Expo is down')),
    };
    const service = createService(
      prisma,
      undefined,
      { listRecent: async () => [] },
      delivery,
    );

    await expect(service.complete(user, 'uc1')).resolves.toMatchObject({
      pointsAwarded: 20,
    });
    expect(delivery.send).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'completion', audience: 'all_devices' }),
    );
  });

  it('stores a sleep log when the new app sends bedtime and wake time', async () => {
    const assignment = sleepAssignment();
    const { prisma, challengeLogUpsert } = createCompletePrismaMock(assignment);
    const service = createService(prisma);
    const wokeUpAt = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const wentToBedAt = new Date(wokeUpAt.getTime() - 8 * 60 * 60 * 1000);
    const sleep = {
      wentToBedAt: wentToBedAt.toISOString().replace('Z', '+00:00'),
      wokeUpAt: wokeUpAt.toISOString().replace('Z', '+00:00'),
      rested: 4,
    };

    await expect(
      service.complete(user, 'uc1', undefined, undefined, { sleep }),
    ).resolves.toMatchObject({ pointsAwarded: 20 });
    expect(challengeLogUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          payload: { kind: 'sleep', fields: sleep },
        }),
      }),
    );
  });
});

function sleepAssignment() {
  return createAssignment({
    status: 'in_progress',
    challenge: {
      ...createAssignment().challenge,
      title: "Log last night’s sleep",
      completionKind: 'check_in',
      captureKind: 'structured_log',
      deviceMetric: 'sleep',
      surpriseEvidenceChancePercent: 0,
    },
  });
}

function createCompletePrismaMock(assignment: ReturnType<typeof createAssignment>) {
  const completed = {
    ...assignment,
    status: 'completed',
    completedAt: new Date(),
  };
  const profile = {
    userId: 'u1',
    pointsBalance: 20,
    currentStreakDays: 1,
    membershipActive: false,
  };
  const challengeLogUpsert = vi.fn().mockResolvedValue({});
  const tx = {
    pointLedgerEntry: {
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
    },
    userChallenge: {
      count: vi.fn().mockResolvedValue(0),
      findFirst: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue(completed),
      findUniqueOrThrow: vi.fn().mockResolvedValue(completed),
    },
    challengeLog: {
      upsert: challengeLogUpsert,
    },
    userProfile: {
      upsert: vi.fn().mockResolvedValue(profile),
      update: vi.fn().mockResolvedValue(profile),
      findUniqueOrThrow: vi.fn().mockResolvedValue(profile),
    },
    notification: {
      upsert: vi.fn().mockResolvedValue({}),
    },
  };
  const prisma = {
    ...createPrismaMock(assignment),
    $transaction: vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    ),
    pushDevice: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  };

  return { prisma, challengeLogUpsert };
}
