import type { UpsertAdminChallengeInput } from '@product/contract';
import { describe, expect, it, vi } from 'vitest';
import { AdminCatalogService } from './catalog.service.js';

const admin = {
  id: 'admin-1',
  email: 'ops@example.com',
  name: 'Ops',
  roles: ['content' as const],
  isActive: true,
};

const water: UpsertAdminChallengeInput = {
  slug: 'log-water-intake',
  title: 'Log your water intake',
  description: 'Track how much water you drank today.',
  instruction: 'Add a glass each time you finish one.',
  category: 'general',
  icon: 'cup-water',
  rewardPoints: 100,
  defaultFrequency: 'daily',
  isDefault: true,
  requiresMembership: false,
  isActive: true,
  completionKind: 'water',
  captureKind: 'structured_log',
  deviceMetric: null,
  targetDurationMinutes: null,
  targetDistanceMeters: null,
  targetCount: null,
  surpriseEvidenceChancePercent: 0,
  surpriseEvidenceWindowSeconds: 60,
  surpriseEvidencePenaltyPoints: 25,
  sortOrder: 100,
};

function createPrismaMock() {
  return {
    challenge: {
      findUnique: vi.fn(async () => null),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'c-water',
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
        _count: { enrollments: 0 },
      })),
    },
  };
}

function createdTargetCount(prisma: ReturnType<typeof createPrismaMock>): unknown {
  return prisma.challenge.create.mock.calls[0]?.[0]?.data.targetCount;
}

describe('AdminCatalogService water goal', () => {
  it('gives a water challenge left blank the default of eight glasses', async () => {
    const prisma = createPrismaMock();
    await new AdminCatalogService(prisma as never).create(admin, water);

    expect(createdTargetCount(prisma)).toBe(8);
  });

  it('keeps the glass goal an admin sets', async () => {
    const prisma = createPrismaMock();
    await new AdminCatalogService(prisma as never).create(admin, { ...water, targetCount: 6 });

    expect(createdTargetCount(prisma)).toBe(6);
  });

  it('leaves the target of other challenges as entered', async () => {
    const prisma = createPrismaMock();
    await new AdminCatalogService(prisma as never).create(admin, {
      ...water,
      slug: 'stretch',
      completionKind: 'check_in',
      captureKind: 'self_report',
    });

    expect(createdTargetCount(prisma)).toBeNull();
  });
});
