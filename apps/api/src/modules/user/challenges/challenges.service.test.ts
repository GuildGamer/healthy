import { ORPCError } from '@orpc/server';
import { DEFAULT_CHALLENGE_ICON } from '@product/contract';
import { describe, expect, it, vi } from 'vitest';
import { ChallengesService } from './challenges.service.js';

const user = { id: 'u1', email: 'a@b.co', name: 'Ada' };

const TIME_ZONE = 'Asia/Singapore';

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
    challenge: {
      title: 'Walk 20 minutes',
      description: 'A brisk walk after lunch.',
      category: 'general',
      rewardPoints: 20,
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
) {
  return {
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
) {
  return {
    userProfile: {
      findUnique: vi.fn().mockResolvedValue({ timeZone: TIME_ZONE }),
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

    await new ChallengesService(prisma as never).listToday(user);

    expect(createdRows(prisma.userChallenge.createMany)).toHaveLength(2);
  });

  it('creates nothing when the user has no enrolments', async () => {
    const prisma = createListPrismaMock([]);

    const result = await new ChallengesService(prisma as never).listToday(user);

    expect(prisma.userChallenge.createMany).not.toHaveBeenCalled();
    expect(result.challenges).toEqual([]);
    expect(result.totalCount).toBe(0);
  });

  it('only considers enrolments that are active on both sides', async () => {
    const prisma = createListPrismaMock([]);

    await new ChallengesService(prisma as never).listToday(user);

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

    await new ChallengesService(prisma as never).listToday(user);

    const [argument] = prisma.userChallenge.createMany.mock.calls[0] as [
      { skipDuplicates: boolean },
    ];
    expect(argument.skipDuplicates).toBe(true);
  });

  it('buckets a daily occurrence by the profile time zone', async () => {
    const prisma = createListPrismaMock([
      { id: 'e1', challengeId: 'c1', frequency: 'daily' },
    ]);

    const result = await new ChallengesService(prisma as never).listToday(user);

    expect(result.dayKey).toBe(localDayKey(TIME_ZONE));
    expect(createdRows(prisma.userChallenge.createMany)[0]?.periodKey).toBe(
      localDayKey(TIME_ZONE),
    );
  });

  it('anchors a weekly occurrence to the Monday of the local week', async () => {
    const prisma = createListPrismaMock([
      { id: 'e1', challengeId: 'c1', frequency: 'weekly' },
    ]);

    await new ChallengesService(prisma as never).listToday(user);

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

    await new ChallengesService(prisma as never).listToday(user);

    expect(createdRows(prisma.userChallenge.createMany)[0]?.periodKey).toBe(
      `${localDayKey(TIME_ZONE).slice(0, 7)}-01`,
    );
  });

  it('reads back occurrences already in progress', async () => {
    const prisma = createListPrismaMock(
      [{ id: 'e1', challengeId: 'c1', frequency: 'daily' }],
      [createAssignment({ id: 'uc-old', status: 'in_progress' })],
    );

    const result = await new ChallengesService(prisma as never).listToday(user);

    expect(result.challenges).toHaveLength(1);
    expect(result.challenges[0]?.status).toBe('in_progress');
    expect(result.completedCount).toBe(0);
  });

  it('scopes the read to the open period of each cadence', async () => {
    const prisma = createListPrismaMock([]);

    await new ChallengesService(prisma as never).listToday(user);

    const [argument] = prisma.userChallenge.findMany.mock.calls.at(-1) as [
      { where: { OR: Array<{ frequency: string }> } },
    ];
    expect(argument.where.OR.map((clause) => clause.frequency)).toEqual([
      'daily',
      'weekly',
      'monthly',
    ]);
  });
});

describe('ChallengesService.start', () => {
  it('rejects unauthenticated callers with ORPC UNAUTHORIZED', async () => {
    const service = new ChallengesService(createPrismaMock(null) as never);

    await expect(service.start(null, 'uc1')).rejects.toBeInstanceOf(ORPCError);
  });

  it('rejects an assignment belonging to another user', async () => {
    const prisma = createPrismaMock(
      createAssignment({ userId: 'someone-else' }),
    );
    const service = new ChallengesService(prisma as never);

    await expect(service.start(user, 'uc1')).rejects.toBeInstanceOf(ORPCError);
    expect(prisma.userChallenge.updateMany).not.toHaveBeenCalled();
  });

  it('moves a pending assignment to in_progress', async () => {
    const prisma = createPrismaMock(createAssignment());
    prisma.userChallenge.findUniqueOrThrow.mockResolvedValue(
      createAssignment({ status: 'in_progress', startedAt: new Date() }),
    );
    const service = new ChallengesService(prisma as never);

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
    const service = new ChallengesService(prisma as never);

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
    const service = new ChallengesService(prisma as never);

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
    const service = new ChallengesService(prisma as never);

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
    const service = new ChallengesService(prisma as never);

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
    const service = new ChallengesService(prisma as never, {
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
});
