import { describe, expect, it, vi } from 'vitest';
import { TREATMENT_HABIT_SLOT_MINUTES } from './constants.js';
import { EngagementPolicyService } from './engagement-policy.service.js';

function createPrisma(options?: {
  profiles?: Array<{ userId: string; timeZone: string }>;
  deliveries?: Array<{ userId: string; sentAt: Date }>;
  activeUserIds?: string[];
}) {
  return {
    userProfile: {
      findMany: vi.fn().mockResolvedValue(options?.profiles ?? []),
    },
    engagementDelivery: {
      findMany: vi.fn().mockResolvedValue(options?.deliveries ?? []),
    },
    analyticsEvent: {
      findMany: vi.fn().mockResolvedValue(
        (options?.activeUserIds ?? []).map((userId) => ({ userId })),
      ),
    },
    challenge: { findMany: vi.fn() },
    userChallenge: { findMany: vi.fn() },
  };
}

describe('EngagementPolicyService.cadencePlanFor', () => {
  it('returns three habit slots with quiet hours and a shared daily budget', async () => {
    const prisma = createPrisma({
      profiles: [{ userId: 'u1', timeZone: 'UTC' }],
      deliveries: [
        { userId: 'u1', sentAt: new Date('2026-08-29T08:05:00.000Z') },
        { userId: 'u1', sentAt: new Date('2026-08-29T14:05:00.000Z') },
      ],
    });
    const service = new EngagementPolicyService(prisma as never);
    const now = new Date('2026-08-29T22:30:00.000Z');

    const plans = await service.cadencePlanFor(['u1'], now);
    const plan = plans.get('u1');

    expect(plan).toEqual({
      variantKey: 'treatment',
      habitMinutes: TREATMENT_HABIT_SLOT_MINUTES,
      remainingBudget: 1,
      skipHabitForActivity: false,
      quietNow: true,
      timeZone: 'UTC',
      dayKey: '2026-08-29',
      localMinute: 22 * 60 + 30,
    });
  });

  it('marks recently active members to skip habit slots', async () => {
    const prisma = createPrisma({
      profiles: [{ userId: 'u1', timeZone: 'UTC' }],
      activeUserIds: ['u1'],
    });
    const service = new EngagementPolicyService(prisma as never);
    const now = new Date('2026-08-29T08:02:00.000Z');

    const plans = await service.cadencePlanFor(['u1'], now);
    const plan = plans.get('u1');

    expect(plan?.habitMinutes).toEqual([...TREATMENT_HABIT_SLOT_MINUTES]);
    expect(plan?.remainingBudget).toBe(3);
    expect(plan?.skipHabitForActivity).toBe(true);
    expect(plan?.quietNow).toBe(false);
    expect(plan?.variantKey).toBe('treatment');
  });

  it('defaults missing profiles to UTC with full budget', async () => {
    const prisma = createPrisma({});
    const service = new EngagementPolicyService(prisma as never);
    const now = new Date('2026-08-29T08:02:00.000Z');

    const plans = await service.cadencePlanFor(['u-missing'], now);
    const plan = plans.get('u-missing');

    expect(plan?.habitMinutes).toEqual([...TREATMENT_HABIT_SLOT_MINUTES]);
    expect(plan?.remainingBudget).toBe(3);
    expect(plan?.skipHabitForActivity).toBe(false);
    expect(plan?.quietNow).toBe(false);
    expect(plan?.timeZone).toBe('UTC');
  });

  it('returns an empty map for an empty user list', async () => {
    const prisma = createPrisma();
    const service = new EngagementPolicyService(prisma as never);

    await expect(service.cadencePlanFor([])).resolves.toEqual(new Map());
    expect(prisma.userProfile.findMany).not.toHaveBeenCalled();
  });
});
