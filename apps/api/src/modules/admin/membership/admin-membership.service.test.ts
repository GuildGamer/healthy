import { ORPCError } from '@orpc/server';
import { describe, expect, it, vi } from 'vitest';
import { AdminMembershipService } from './admin-membership.service.js';
import type { UpdateMembershipPlanInput } from '@product/contract';

const admin = {
  id: 'admin-1',
  email: 'ops@healthy.app',
  name: 'Ops',
  roles: ['content' as const],
  isActive: true,
};

function planInput() {
  return {
    id: 'plan-1',
    slug: 'healthy-starter',
    name: 'Healthy',
    tagline: 'Keep the streak honest.',
    features: ['Full catalog'],
    interval: 'year' as const,
    isActive: true,
    sortOrder: 0,
    headline: null,
    ctaLabel: null,
    paymentMethodIds: [] as UpdateMembershipPlanInput['paymentMethodIds'],
    prices: [
      { marketKey: 'NG' as const, currency: 'NGN' as const, amountMinor: 100_000 },
    ],
  };
}

describe('AdminMembershipService live billing lock', () => {
  it('rejects slug or interval changes after a subscription exists', async () => {
    const service = new AdminMembershipService({
      membershipPlan: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'plan-1',
          slug: 'healthy-starter',
          interval: 'month',
        }),
      },
      membershipProduct: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      subscription: {
        findMany: vi.fn().mockResolvedValue([{ planId: 'plan-1' }]),
      },
    } as never);

    await expect(service.update(admin, planInput())).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
  });

  it('allows copy and price edits on a live plan', async () => {
    const updated = {
      id: 'plan-1',
      slug: 'healthy-starter',
      name: 'Healthy Plus',
      tagline: 'Keep the streak honest.',
      features: ['Full catalog'],
      interval: 'month',
      isActive: true,
      sortOrder: 0,
      headline: null,
      ctaLabel: null,
      paymentMethodIds: [],
      prices: [
        {
          id: 'price-1',
          marketKey: 'NG',
          currency: 'NGN',
          amountMinor: 150_000,
        },
      ],
      createdAt: new Date('2026-09-01T00:00:00.000Z'),
      updatedAt: new Date('2026-09-16T00:00:00.000Z'),
    };

    const service = new AdminMembershipService({
      membershipPlan: {
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({
            id: 'plan-1',
            slug: 'healthy-starter',
            interval: 'month',
          })
          .mockResolvedValueOnce({ id: 'plan-1' }),
        update: vi.fn().mockResolvedValue(updated),
      },
      membershipPlanPrice: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      membershipProduct: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      subscription: {
        findMany: vi.fn().mockResolvedValue([{ planId: 'plan-1' }]),
      },
      $transaction: async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          membershipPlanPrice: {
            deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
          },
          membershipPlan: {
            update: vi.fn().mockResolvedValue(updated),
          },
        }),
    } as never);

    const result = await service.update(admin, {
      ...planInput(),
      interval: 'month',
      name: 'Healthy Plus',
      prices: [
        {
          marketKey: 'NG',
          currency: 'NGN',
          amountMinor: 150_000,
        },
      ],
    });

    expect(result.plan.name).toBe('Healthy Plus');
    expect(result.plan.hasLiveBilling).toBe(true);
    expect(result.plan.interval).toBe('month');
  });
});

describe('AdminMembershipService errors', () => {
  it('throws NOT_FOUND when the plan is missing', async () => {
    const service = new AdminMembershipService({
      membershipPlan: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    } as never);

    await expect(service.update(admin, planInput())).rejects.toBeInstanceOf(
      ORPCError,
    );
  });
});
