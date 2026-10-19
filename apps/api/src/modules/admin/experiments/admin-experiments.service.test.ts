import { describe, expect, it, vi } from 'vitest';
import { ORPCError } from '@orpc/server';
import { AdminExperimentsService } from './admin-experiments.service.js';

const admin = {
  id: 'admin_1',
  email: 'ops@healthy.app',
  name: 'Ops',
  roles: ['superadmin' as const],
  isActive: true,
};

function createPrismaMock() {
  const variants = [
    {
      id: 'v_control',
      key: 'control',
      name: 'Control',
      weight: 0,
      _count: { assignments: 2 },
      createdAt: new Date('2026-10-01T00:00:00.000Z'),
    },
    {
      id: 'v_treatment',
      key: 'treatment',
      name: 'Treatment',
      weight: 1,
      _count: { assignments: 10 },
      createdAt: new Date('2026-10-01T00:00:01.000Z'),
    },
  ];

  const experiment = {
    id: 'exp_challenge_referral_v1',
    key: 'challenge_referral_v1',
    name: 'Challenge Referral v1',
    description: 'Test',
    status: 'running',
    primaryMetric: 'activated_friend_rate',
    startAt: new Date('2026-10-01T00:00:00.000Z'),
    endAt: null,
    variants,
    _count: { assignments: 12 },
  };

  return {
    experiment: {
      findMany: vi.fn().mockResolvedValue([experiment]),
      findUnique: vi.fn().mockResolvedValue(experiment),
    },
    experimentVariant: {
      update: vi.fn().mockResolvedValue({}),
    },
    match: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'm1',
          hostUserId: 'host',
          firstOpenedAt: new Date(),
          parentMatchId: null,
          participants: [{ userId: 'host' }, { userId: 'guest' }],
          attempts: [{ userId: 'guest' }],
          _count: { childMatches: 1 },
        },
      ]),
    },
    analyticsEvent: {
      findMany: vi.fn().mockImplementation(async ({ where }: { where: { name: string } }) => {
        if (where.name === 'challenge_created') {
          return [
            {
              properties: {
                experiment_id: experiment.id,
                experiment_variant: 'treatment',
              },
            },
          ];
        }

        return [];
      }),
    },
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  };
}

describe('AdminExperimentsService', () => {
  it('builds Stage 1 funnel rates and accepts snake_case event props', async () => {
    const prisma = createPrismaMock();
    const service = new AdminExperimentsService(prisma as never);

    const detail = await service.get(admin as never, 'exp_challenge_referral_v1');

    expect(detail.stageHint).toContain('Stage 1');
    const treatment = detail.variants.find((row) => row.variantKey === 'treatment');
    expect(treatment?.weight).toBe(1);
    expect(treatment?.challengeSendRate).toBeCloseTo(1 / 10);
    expect(treatment?.inviteAcceptRate).toBe(1);
    expect(treatment?.activatedFriendRate).toBe(1);
    expect(treatment?.secondGenerationRate).toBe(1);
    expect(
      treatment?.funnel.find((step) => step.key === 'challenge_created')?.count,
    ).toBe(1);
  });

  it('updates weights for Stage 2 without auto-flipping elsewhere', async () => {
    const prisma = createPrismaMock();
    const service = new AdminExperimentsService(prisma as never);

    await service.updateWeights(admin as never, {
      id: 'exp_challenge_referral_v1',
      variants: [
        { variantKey: 'control', weight: 1 },
        { variantKey: 'treatment', weight: 1 },
      ],
    });

    expect(prisma.experimentVariant.update).toHaveBeenCalledTimes(2);
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('rejects unknown variant keys', async () => {
    const prisma = createPrismaMock();
    const service = new AdminExperimentsService(prisma as never);

    await expect(
      service.updateWeights(admin as never, {
        id: 'exp_challenge_referral_v1',
        variants: [{ variantKey: 'ghost', weight: 1 }],
      }),
    ).rejects.toBeInstanceOf(ORPCError);
  });
});
