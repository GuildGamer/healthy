import { ORPCError } from '@orpc/server';
import { DEFAULT_CHALLENGE_ICON } from '@product/contract';
import { describe, expect, it, vi } from 'vitest';
import { periodKeyFor } from '../../../shared/utils/period-key.js';
import { EnrollmentsService } from './enrollments.service.js';

const user = { id: 'u1', email: 'a@b.co', name: 'Ada' };

type CatalogRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  rewardPoints: number;
  defaultFrequency: string;
  completionKind: string;
  instruction: string;
  icon: string;
  requiresMembership: boolean;
  captureKind?: string;
  deviceMetric?: string | null;
  targetCount?: number | null;
  sortOrder?: number;
};

function catalogRow(overrides: Partial<CatalogRow> = {}): CatalogRow {
  return {
    id: 'c1',
    slug: 'walk',
    title: 'Take a walk',
    description: 'Ten minutes outside.',
    category: 'general',
    rewardPoints: 100,
    defaultFrequency: 'daily',
    completionKind: 'check_in',
    instruction: 'Ten minutes outside.',
    icon: 'walk',
    requiresMembership: false,
    sortOrder: 100,
    ...overrides,
  };
}

function createPrismaMock(options: {
  categories?: string[] | null;
  catalog?: CatalogRow[];
  enrollments?: Array<{
    challengeId: string;
    frequency: string;
    isActive: boolean;
    targetCount?: number | null;
  }>;
  challenge?: Record<string, unknown> | null;
  membershipActive?: boolean;
  existingEnrollment?: {
    id: string;
    isActive: boolean;
    targetCount: number | null;
    frequency: string;
  } | null;
  openOccurrences?: Array<{ id: string; frequency: string; periodKey: string }>;
  occupyingOccurrenceId?: string | null;
}) {
  return {
    userProfile: {
      findUnique: vi.fn().mockImplementation(() => {
        if (options.categories === null) {
          return Promise.resolve(null);
        }

        return Promise.resolve({
          healthCategories: options.categories ?? ['general'],
          membershipActive: options.membershipActive ?? false,
          timeZone: 'UTC',
        });
      }),
    },
    challenge: {
      findMany: vi.fn().mockResolvedValue(options.catalog ?? []),
      findUnique: vi.fn().mockResolvedValue(
        options.challenge === undefined
          ? {
              id: 'c1',
              isActive: true,
              defaultFrequency: 'daily',
              requiresMembership: false,
              targetCount: null,
            }
          : options.challenge,
      ),
    },
    challengeEnrollment: {
      findMany: vi.fn().mockResolvedValue(
        (options.enrollments ?? []).map((enrollment) => ({
          ...enrollment,
          reminders: [],
        })),
      ),
      findUnique: vi.fn().mockResolvedValue(
        options.existingEnrollment === undefined ? null : options.existingEnrollment,
      ),
      upsert: vi.fn().mockResolvedValue({ id: 'e1' }),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    userChallenge: {
      findMany: vi.fn().mockResolvedValue(options.openOccurrences ?? []),
      findUnique: vi.fn().mockResolvedValue(
        options.occupyingOccurrenceId
          ? { id: options.occupyingOccurrenceId }
          : null,
      ),
      update: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({}),
    },
  };
}

function createRemindersMock() {
  return { seedDefaultReminders: vi.fn().mockResolvedValue(undefined) };
}

function createService(prisma: ReturnType<typeof createPrismaMock>) {
  return new EnrollmentsService(prisma as never, createRemindersMock() as never);
}

describe('EnrollmentsService.listCatalog', () => {
  it('orders catalog rows by sortOrder in the database query', async () => {
    const prisma = createPrismaMock({
      catalog: [
        catalogRow({ id: 'c2', slug: 'walk', title: 'Walk', sortOrder: 100 }),
        catalogRow({ id: 'c1', slug: 'pushups', title: 'Push-ups', sortOrder: 0 }),
      ],
    });

    await createService(prisma).listCatalog(user);

    expect(prisma.challenge.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { title: 'asc' }],
      }),
    );
  });

  it('falls back to the catalog cadence for a challenge with no enrolment', async () => {
    const prisma = createPrismaMock({
      catalog: [catalogRow({ defaultFrequency: 'weekly' })],
    });

    const result = await createService(prisma).listCatalog(user);

    expect(result.challenges[0]).toMatchObject({
      frequency: 'weekly',
      isEnrolled: false,
      icon: 'walk',
    });
    expect(result.enrolledCount).toBe(0);
  });

  it('falls back when the catalog icon is empty', async () => {
    const prisma = createPrismaMock({
      catalog: [catalogRow({ icon: '' })],
    });

    const result = await createService(prisma).listCatalog(user);

    expect(result.challenges[0]?.icon).toBe(DEFAULT_CHALLENGE_ICON);
  });

  it("prefers the user's own cadence over the catalog default", async () => {
    const prisma = createPrismaMock({
      catalog: [catalogRow({ defaultFrequency: 'daily' })],
      enrollments: [{ challengeId: 'c1', frequency: 'weekly', isActive: true }],
    });

    const result = await createService(prisma).listCatalog(user);

    expect(result.challenges[0]).toMatchObject({
      frequency: 'weekly',
      isEnrolled: true,
    });
    expect(result.enrolledCount).toBe(1);
  });

  it("prefers the user's own push-up count over the catalog default", async () => {
    const prisma = createPrismaMock({
      catalog: [
        catalogRow({
          captureKind: 'device_session',
          deviceMetric: 'pushups',
          targetCount: 20,
        }),
      ],
      enrollments: [
        {
          challengeId: 'c1',
          frequency: 'daily',
          isActive: true,
          targetCount: 12,
        },
      ],
    });

    const result = await createService(prisma).listCatalog(user);

    expect(result.challenges[0]?.capture.target.count).toBe(12);
    expect(result.challenges[0]?.title).toBe('Do 12 push-ups');
  });

  it('treats a deactivated enrolment as not enrolled', async () => {
    const prisma = createPrismaMock({
      catalog: [catalogRow()],
      enrollments: [{ challengeId: 'c1', frequency: 'daily', isActive: false }],
    });

    const result = await createService(prisma).listCatalog(user);

    expect(result.challenges[0]?.isEnrolled).toBe(false);
    expect(result.enrolledCount).toBe(0);
  });

  it.each([[['asthma']], [[]]])(
    'offers only everyday health while conditions are out of scope (chosen: %j)',
    async (categories) => {
      const prisma = createPrismaMock({ categories });

      await createService(prisma).listCatalog(user);

      const [argument] = prisma.challenge.findMany.mock.calls[0] as [
        { where: { category: { in: string[] } } },
      ];
      expect(argument.where.category.in).toEqual(['general']);
    },
  );

  it('rejects unauthenticated callers', async () => {
    const prisma = createPrismaMock({});

    await expect(createService(prisma).listCatalog(null)).rejects.toBeInstanceOf(ORPCError);
  });
});

describe('EnrollmentsService.setEnrollment', () => {
  it('rejects a challenge that does not exist', async () => {
    const prisma = createPrismaMock({ challenge: null });

    await expect(createService(prisma).setEnrollment(user, 'nope', true)).rejects.toBeInstanceOf(
      ORPCError,
    );
    expect(prisma.challengeEnrollment.upsert).not.toHaveBeenCalled();
  });

  it('refuses to enrol in a retired challenge', async () => {
    const prisma = createPrismaMock({
      challenge: {
        id: 'c1',
        isActive: false,
        defaultFrequency: 'daily',
        requiresMembership: false,
        targetCount: null,
      },
    });

    await expect(createService(prisma).setEnrollment(user, 'c1', true)).rejects.toBeInstanceOf(
      ORPCError,
    );
  });

  it('blocks free users from joining a membership challenge', async () => {
    const prisma = createPrismaMock({
      challenge: {
        id: 'c1',
        isActive: true,
        defaultFrequency: 'daily',
        requiresMembership: true,
        targetCount: null,
      },
      membershipActive: false,
    });

    await expect(createService(prisma).setEnrollment(user, 'c1', true)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(prisma.challengeEnrollment.upsert).not.toHaveBeenCalled();
  });

  it('stores the requested cadence', async () => {
    const prisma = createPrismaMock({ catalog: [catalogRow()] });

    await createService(prisma).setEnrollment(user, 'c1', true, 'monthly');

    const [argument] = prisma.challengeEnrollment.upsert.mock.calls[0] as [
      { create: { frequency: string }; update: { frequency: string } },
    ];
    expect(argument.create.frequency).toBe('monthly');
    expect(argument.update.frequency).toBe('monthly');
  });

  it('falls back to the catalog cadence when none is given', async () => {
    const prisma = createPrismaMock({
      challenge: {
        id: 'c1',
        isActive: true,
        defaultFrequency: 'weekly',
        requiresMembership: false,
        targetCount: null,
      },
      catalog: [catalogRow()],
    });

    await createService(prisma).setEnrollment(user, 'c1', true);

    const [argument] = prisma.challengeEnrollment.upsert.mock.calls[0] as [
      { create: { frequency: string } },
    ];
    expect(argument.create.frequency).toBe('weekly');
  });

  it('stores a count goal on challenges that have one', async () => {
    const prisma = createPrismaMock({
      challenge: {
        id: 'c1',
        isActive: true,
        defaultFrequency: 'daily',
        requiresMembership: false,
        targetCount: 20,
      },
      catalog: [catalogRow()],
    });

    await createService(prisma).setEnrollment(user, 'c1', true, undefined, {
      targetCount: 12,
    });

    const [argument] = prisma.challengeEnrollment.upsert.mock.calls[0] as [
      { create: { targetCount: number }; update: { targetCount: number } },
    ];
    expect(argument.create.targetCount).toBe(12);
    expect(argument.update.targetCount).toBe(12);
  });

  it('rejects a count goal on a challenge without a catalog target', async () => {
    const prisma = createPrismaMock({ catalog: [catalogRow()] });

    await expect(
      createService(prisma).setEnrollment(user, 'c1', true, undefined, { targetCount: 12 }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(prisma.challengeEnrollment.upsert).not.toHaveBeenCalled();
  });

  it('stores a minutes goal on a timed challenge', async () => {
    const prisma = createPrismaMock({
      challenge: {
        id: 'c1',
        isActive: true,
        defaultFrequency: 'daily',
        requiresMembership: false,
        targetCount: null,
        targetDurationMinutes: 10,
      },
      catalog: [catalogRow()],
    });

    await createService(prisma).setEnrollment(user, 'c1', true, undefined, {
      targetDurationMinutes: 25,
    });

    const [argument] = prisma.challengeEnrollment.upsert.mock.calls[0] as [
      {
        create: { targetDurationMinutes: number };
        update: { targetDurationMinutes: number };
      },
    ];
    expect(argument.create.targetDurationMinutes).toBe(25);
    expect(argument.update.targetDurationMinutes).toBe(25);
  });

  it.each([4, 121])('rejects %i minutes, outside five minutes to two hours', async (minutes) => {
    const prisma = createPrismaMock({
      challenge: {
        id: 'c1',
        isActive: true,
        defaultFrequency: 'daily',
        requiresMembership: false,
        targetCount: null,
        targetDurationMinutes: 10,
      },
      catalog: [catalogRow()],
    });

    await expect(
      createService(prisma).setEnrollment(user, 'c1', true, undefined, {
        targetDurationMinutes: minutes,
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(prisma.challengeEnrollment.upsert).not.toHaveBeenCalled();
  });

  it('rejects a minutes goal on a challenge that is not timed', async () => {
    const prisma = createPrismaMock({ catalog: [catalogRow()] });

    await expect(
      createService(prisma).setEnrollment(user, 'c1', true, undefined, {
        targetDurationMinutes: 20,
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('deactivates rather than deletes when opting out', async () => {
    const prisma = createPrismaMock({ catalog: [catalogRow()] });

    await createService(prisma).setEnrollment(user, 'c1', false);

    const [argument] = prisma.challengeEnrollment.upsert.mock.calls[0] as [
      { update: { isActive: boolean } },
    ];
    expect(argument.update.isActive).toBe(false);
  });

  it('moves an open occurrence onto the new cadence', async () => {
    const prisma = createPrismaMock({
      catalog: [catalogRow()],
      existingEnrollment: {
        id: 'e1',
        isActive: true,
        targetCount: null,
        frequency: 'monthly',
      },
      openOccurrences: [{ id: 'uc-month', frequency: 'monthly', periodKey: '2026-10-01' }],
    });

    await createService(prisma).setEnrollment(user, 'c1', true, 'daily');

    expect(prisma.userChallenge.update).toHaveBeenCalledWith({
      where: { id: 'uc-month' },
      data: {
        frequency: 'daily',
        periodKey: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      },
    });
    expect(prisma.userChallenge.delete).not.toHaveBeenCalled();
  });

  it('deletes an obsolete open occurrence when the new period key is taken', async () => {
    const todayKey = periodKeyFor('daily', 'UTC');
    const prisma = createPrismaMock({
      catalog: [catalogRow()],
      existingEnrollment: {
        id: 'e1',
        isActive: true,
        targetCount: null,
        frequency: 'monthly',
      },
      openOccurrences: [
        { id: 'uc-day', frequency: 'daily', periodKey: todayKey },
        { id: 'uc-month', frequency: 'monthly', periodKey: '2026-10-01' },
      ],
      occupyingOccurrenceId: 'uc-day',
    });

    await createService(prisma).setEnrollment(user, 'c1', true, 'daily');

    expect(prisma.userChallenge.delete).toHaveBeenCalledWith({ where: { id: 'uc-month' } });
    expect(prisma.userChallenge.update).not.toHaveBeenCalled();
  });

  it('leaves open occurrences alone when the cadence did not change', async () => {
    const prisma = createPrismaMock({
      catalog: [catalogRow()],
      existingEnrollment: {
        id: 'e1',
        isActive: true,
        targetCount: null,
        frequency: 'daily',
      },
      openOccurrences: [{ id: 'uc1', frequency: 'daily', periodKey: '2026-10-28' }],
    });

    await createService(prisma).setEnrollment(user, 'c1', true, 'daily');

    expect(prisma.userChallenge.findMany).not.toHaveBeenCalled();
  });
});

describe('EnrollmentsService.enrollDefaultsFor', () => {
  it('enrols only the challenges flagged as defaults', async () => {
    const prisma = createPrismaMock({
      catalog: [catalogRow()],
    });
    prisma.challenge.findMany.mockResolvedValue([{ id: 'c1', defaultFrequency: 'daily' }]);

    await createService(prisma).enrollDefaultsFor(user.id, ['general']);

    const [argument] = prisma.challenge.findMany.mock.calls[0] as [
      { where: Record<string, unknown> },
    ];
    expect(argument.where).toMatchObject({ isDefault: true, isActive: true });
  });

  it('never revives an enrolment the user turned off', async () => {
    const prisma = createPrismaMock({});
    prisma.challenge.findMany.mockResolvedValue([{ id: 'c1', defaultFrequency: 'daily' }]);

    await createService(prisma).enrollDefaultsFor(user.id, ['general']);

    const [argument] = prisma.challengeEnrollment.createMany.mock.calls[0] as [
      { skipDuplicates: boolean },
    ];
    expect(argument.skipDuplicates).toBe(true);
  });

  it('writes nothing when the categories have no default challenges', async () => {
    const prisma = createPrismaMock({});
    prisma.challenge.findMany.mockResolvedValue([]);

    await createService(prisma).enrollDefaultsFor(user.id, ['general']);

    expect(prisma.challengeEnrollment.createMany).not.toHaveBeenCalled();
  });
});

describe('EnrollmentsService.listStarterChallenges', () => {
  it('lists only active default challenges, with no account needed', async () => {
    const prisma = createPrismaMock({ catalog: [catalogRow()] });

    await createService(prisma).listStarterChallenges();

    const [argument] = prisma.challenge.findMany.mock.calls[0] as [
      { where: Record<string, unknown> },
    ];
    expect(argument.where).toEqual({ isActive: true, isDefault: true });
    expect(prisma.userProfile.findUnique).not.toHaveBeenCalled();
  });

  it('marks general health as included whatever is picked', async () => {
    const prisma = createPrismaMock({
      catalog: [
        catalogRow({ id: 'walk', category: 'general' }),
        catalogRow({ id: 'bp', category: 'hypertension', completionKind: 'vitals_bp' }),
      ],
    });

    const { challenges } = await createService(prisma).listStarterChallenges();

    expect(challenges.map((challenge) => [challenge.challengeId, challenge.isUniversal])).toEqual([
      ['walk', true],
      ['bp', false],
    ]);
  });
});
