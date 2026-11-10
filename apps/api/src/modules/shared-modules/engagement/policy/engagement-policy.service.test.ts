import { describe, expect, it, vi } from 'vitest';
import { HABIT_SLOT_MINUTES } from '../constants/habit-slot-copy.js';
import { EngagementPolicyService } from './engagement-policy.service.js';

function createPrisma(profiles: Array<{ userId: string; timeZone: string }> = []) {
  return {
    userProfile: {
      findMany: vi.fn().mockResolvedValue(profiles),
    },
    challenge: { findMany: vi.fn() },
    userChallenge: { findMany: vi.fn() },
  };
}

describe('EngagementPolicyService.cadencePlanFor', () => {
  it('always returns six habit slots with no cadence caps', async () => {
    const prisma = createPrisma([{ userId: 'u1', timeZone: 'UTC' }]);
    const service = new EngagementPolicyService(prisma as never);
    const now = new Date('2026-08-29T22:30:00.000Z');

    const plans = await service.cadencePlanFor(['u1'], now);
    const plan = plans.get('u1');

    expect(plan).toEqual({
      variantKey: 'holdout',
      habitMinutes: HABIT_SLOT_MINUTES,
      remainingBudget: Number.POSITIVE_INFINITY,
      skipHabitForActivity: false,
      quietNow: false,
      timeZone: 'UTC',
      dayKey: '2026-08-29',
      localMinute: 22 * 60 + 30,
    });
  });

  it('defaults missing profiles to UTC without capping', async () => {
    const prisma = createPrisma([]);
    const service = new EngagementPolicyService(prisma as never);
    const now = new Date('2026-08-29T08:02:00.000Z');

    const plans = await service.cadencePlanFor(['u-missing'], now);
    const plan = plans.get('u-missing');

    expect(plan?.habitMinutes).toEqual([...HABIT_SLOT_MINUTES]);
    expect(plan?.remainingBudget).toBe(Number.POSITIVE_INFINITY);
    expect(plan?.skipHabitForActivity).toBe(false);
    expect(plan?.quietNow).toBe(false);
    expect(plan?.variantKey).toBe('holdout');
    expect(plan?.timeZone).toBe('UTC');
  });

  it('returns an empty map for an empty user list', async () => {
    const prisma = createPrisma();
    const service = new EngagementPolicyService(prisma as never);

    await expect(service.cadencePlanFor([])).resolves.toEqual(new Map());
    expect(prisma.userProfile.findMany).not.toHaveBeenCalled();
  });
});
