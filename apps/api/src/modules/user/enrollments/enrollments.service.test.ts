import { ORPCError } from '@orpc/server';
import { DEFAULT_CHALLENGE_ICON } from '@product/contract';
import { describe, expect, it, vi } from 'vitest';
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
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({ id: 'e1' }),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  };
}

function createRemindersMock() {
  return { seedDefaultReminders: vi.fn().mockResolvedValue(undefined) };
}

function createService(prisma: ReturnType<typeof createPrismaMock>) {
  return new EnrollmentsService(
    prisma as never,
    createRemindersMock() as never,
  );
}

describe('EnrollmentsService.listCatalog', () => {
  it('falls back to the catalog cadence for a challenge with no enrolment', async () => {
    const prisma = createPrismaMock({
      catalog: [catalogRow({ defaultFrequency: 'weekly' })],
    });

    const result = await createService(prisma).listCatalog(
      user,
    );

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

    const result = await createService(prisma).listCatalog(
      user,
    );

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
  });

  it('treats a deactivated enrolment as not enrolled', async () => {
    const prisma = createPrismaMock({
      catalog: [catalogRow()],
      enrollments: [{ challengeId: 'c1', frequency: 'daily', isActive: false }],
    });

    const result = await createService(prisma).listCatalog(
      user,
    );

    expect(result.challenges[0]?.isEnrolled).toBe(false);
    expect(result.enrolledCount).toBe(0);
  });

  it('narrows to the chosen conditions plus general health', async () => {
    const prisma = createPrismaMock({ categories: ['asthma'] });

    await createService(prisma).listCatalog(user);

    const [argument] = prisma.challenge.findMany.mock.calls[0] as [
      { where: { category: { in: string[] } } },
    ];
    expect(argument.where.category.in.sort()).toEqual(['asthma', 'general']);
  });

  it('shows every category before onboarding has chosen any', async () => {
    const prisma = createPrismaMock({ categories: [] });

    await createService(prisma).listCatalog(user);

    const [argument] = prisma.challenge.findMany.mock.calls[0] as [
      { where: { category: { in: string[] } } },
    ];
    expect(argument.where.category.in).toHaveLength(4);
  });

  it('rejects unauthenticated callers', async () => {
    const prisma = createPrismaMock({});

    await expect(
      createService(prisma).listCatalog(null),
    ).rejects.toBeInstanceOf(ORPCError);
  });
});

describe('EnrollmentsService.setEnrollment', () => {
  it('rejects a challenge that does not exist', async () => {
    const prisma = createPrismaMock({ challenge: null });

    await expect(
      createService(prisma).setEnrollment(user, 'nope', true),
    ).rejects.toBeInstanceOf(ORPCError);
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

    await expect(
      createService(prisma).setEnrollment(user, 'c1', true),
    ).rejects.toBeInstanceOf(ORPCError);
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

    await expect(
      createService(prisma).setEnrollment(user, 'c1', true),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(prisma.challengeEnrollment.upsert).not.toHaveBeenCalled();
  });

  it('stores the requested cadence', async () => {
    const prisma = createPrismaMock({ catalog: [catalogRow()] });

    await createService(prisma).setEnrollment(
      user,
      'c1',
      true,
      'monthly',
    );

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

    await createService(prisma).setEnrollment(
      user,
      'c1',
      true,
    );

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

    await createService(prisma).setEnrollment(
      user,
      'c1',
      true,
      undefined,
      12,
    );

    const [argument] = prisma.challengeEnrollment.upsert.mock.calls[0] as [
      { create: { targetCount: number }; update: { targetCount: number } },
    ];
    expect(argument.create.targetCount).toBe(12);
    expect(argument.update.targetCount).toBe(12);
  });

  it('rejects a count goal on a challenge without a catalog target', async () => {
    const prisma = createPrismaMock({ catalog: [catalogRow()] });

    await expect(
      createService(prisma).setEnrollment(user, 'c1', true, undefined, 12),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(prisma.challengeEnrollment.upsert).not.toHaveBeenCalled();
  });

  it('deactivates rather than deletes when opting out', async () => {
    const prisma = createPrismaMock({ catalog: [catalogRow()] });

    await createService(prisma).setEnrollment(
      user,
      'c1',
      false,
    );

    const [argument] = prisma.challengeEnrollment.upsert.mock.calls[0] as [
      { update: { isActive: boolean } },
    ];
    expect(argument.update.isActive).toBe(false);
  });
});

describe('EnrollmentsService.enrollDefaultsFor', () => {
  it('enrols only the challenges flagged as defaults', async () => {
    const prisma = createPrismaMock({
      catalog: [catalogRow()],
    });
    prisma.challenge.findMany.mockResolvedValue([
      { id: 'c1', defaultFrequency: 'daily' },
    ]);

    await createService(prisma).enrollDefaultsFor(user.id, [
      'general',
    ]);

    const [argument] = prisma.challenge.findMany.mock.calls[0] as [
      { where: Record<string, unknown> },
    ];
    expect(argument.where).toMatchObject({ isDefault: true, isActive: true });
  });

  it('never revives an enrolment the user turned off', async () => {
    const prisma = createPrismaMock({});
    prisma.challenge.findMany.mockResolvedValue([
      { id: 'c1', defaultFrequency: 'daily' },
    ]);

    await createService(prisma).enrollDefaultsFor(user.id, [
      'general',
    ]);

    const [argument] = prisma.challengeEnrollment.createMany.mock.calls[0] as [
      { skipDuplicates: boolean },
    ];
    expect(argument.skipDuplicates).toBe(true);
  });

  it('writes nothing when the categories have no default challenges', async () => {
    const prisma = createPrismaMock({});
    prisma.challenge.findMany.mockResolvedValue([]);

    await createService(prisma).enrollDefaultsFor(user.id, [
      'general',
    ]);

    expect(prisma.challengeEnrollment.createMany).not.toHaveBeenCalled();
  });
});
