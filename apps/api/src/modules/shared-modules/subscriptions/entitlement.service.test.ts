import { describe, expect, it, vi } from 'vitest';
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
      user: {
        findUnique: async () => ({ email: 'member@example.com' }),
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
      user: {
        findUnique: async () => ({ email: 'member@example.com' }),
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
      user: {
        findUnique: async () => ({ email: 'member@example.com' }),
      },
    } as never);

    await expect(service.hasActivePremium('user-1', now)).resolves.toBe(false);
  });

  it('treats store reviewers as premium even without a stored entitlement', async () => {
    const service = new EntitlementService({
      entitlement: {
        findFirst: async () => null,
      },
      userProfile: {
        findUnique: async () => ({ membershipActive: false }),
      },
      user: {
        findUnique: async () => ({ email: 'roosterdotcom@gmail.com' }),
      },
    } as never);

    await expect(service.hasActivePremium('user-1', now)).resolves.toBe(true);
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
        findUnique: async () => ({
          membershipActive: false,
          user: { email: 'member@example.com' },
        }),
        upsert,
      },
      user: {
        findUnique: async () => ({ email: 'member@example.com' }),
      },
    } as never);

    await expect(
      service.syncMembershipCache('user-1', now),
    ).resolves.toBe(true);
  });

  it('creates an open-ended admin grant for store reviewers', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'ent-1' });
    const upsert = vi.fn().mockResolvedValue({ membershipActive: true });

    const service = new EntitlementService({
      entitlement: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ endsAt: null }),
        create,
      },
      userProfile: {
        findUnique: async () => ({
          user: { email: 'roosterdotcom@gmail.com' },
        }),
        upsert,
      },
      user: {
        findUnique: async () => ({ email: 'roosterdotcom@gmail.com' }),
      },
    } as never);

    await service.ensureReviewerGrant('user-1', 'roosterdotcom@gmail.com');

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        kind: 'premium',
        source: 'admin_grant',
        endsAt: null,
        grantReason: 'Store reviewer permanent access',
      }),
    });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { membershipActive: true },
      }),
    );
  });

  it('skips grant creation for non-reviewer emails', async () => {
    const create = vi.fn();
    const service = new EntitlementService({
      entitlement: { findFirst: vi.fn(), create },
      userProfile: { upsert: vi.fn() },
      user: { findUnique: vi.fn() },
    } as never);

    await service.ensureReviewerGrant('user-1', 'someone@else.com');

    expect(create).not.toHaveBeenCalled();
  });
});
