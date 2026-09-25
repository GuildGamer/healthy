import { describe, expect, it } from 'vitest';
import { EntitlementService } from './entitlement.service.js';

const now = new Date('2026-09-16T12:00:00.000Z');

describe('EntitlementService', () => {
  it('treats a future-dated premium entitlement as active', async () => {
    const service = new EntitlementService({
      entitlement: {
        findFirst: async () => ({
          endsAt: new Date('2026-10-16T12:00:00.000Z'),
        }),
      },
      userProfile: {
        findUnique: async () => ({ membershipActive: false }),
      },
    } as never);

    await expect(service.hasActivePremium('user-1', now)).resolves.toBe(true);
  });

  it('falls back to the profile cache when no entitlement row exists', async () => {
    const service = new EntitlementService({
      entitlement: {
        findFirst: async () => null,
      },
      userProfile: {
        findUnique: async () => ({ membershipActive: true }),
      },
    } as never);

    await expect(service.hasActivePremium('user-1', now)).resolves.toBe(true);
  });

  it('is inactive when neither entitlement nor cache is set', async () => {
    const service = new EntitlementService({
      entitlement: {
        findFirst: async () => null,
      },
      userProfile: {
        findUnique: async () => ({ membershipActive: false }),
      },
    } as never);

    await expect(service.hasActivePremium('user-1', now)).resolves.toBe(false);
  });

  it('writes the derived membership cache from entitlement state', async () => {
    const upsert = async (args: {
      update: { membershipActive: boolean };
    }) => args.update;

    const service = new EntitlementService({
      entitlement: {
        findFirst: async () => ({
          endsAt: new Date('2026-10-16T12:00:00.000Z'),
        }),
      },
      userProfile: {
        findUnique: async () => ({ membershipActive: false }),
        upsert,
      },
    } as never);

    await expect(
      service.syncMembershipCache('user-1', now),
    ).resolves.toBe(true);
  });
});
