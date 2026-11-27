import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolveMembershipActive } from './resolve-membership-active.js';

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

afterEach(() => {
  if (ORIGINAL_NODE_ENV === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = ORIGINAL_NODE_ENV;
  }
});

describe('resolveMembershipActive staging testers', () => {
  it('grants access for an enabled staging tester only on staging', async () => {
    process.env.NODE_ENV = 'staging';

    const findFirst = vi.fn().mockResolvedValue({ id: 'grant-1' });
    const client = {
      userProfile: {
        findUnique: vi.fn().mockResolvedValue({ membershipActive: false }),
      },
      stagingTesterGrant: { findFirst },
    };

    await expect(
      resolveMembershipActive(client, 'user-1', 'tester@example.com'),
    ).resolves.toBe(true);

    expect(findFirst).toHaveBeenCalledWith({
      where: { email: 'tester@example.com', enabled: true },
      select: { id: true },
    });
  });

  it('ignores staging tester grants outside staging', async () => {
    process.env.NODE_ENV = 'production';

    const findFirst = vi.fn().mockResolvedValue({ id: 'grant-1' });
    const client = {
      userProfile: {
        findUnique: vi.fn().mockResolvedValue({ membershipActive: false }),
      },
      stagingTesterGrant: { findFirst },
    };

    await expect(
      resolveMembershipActive(client, 'user-1', 'tester@example.com'),
    ).resolves.toBe(false);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('denies access when the staging grant is missing or disabled', async () => {
    process.env.NODE_ENV = 'staging';

    const client = {
      userProfile: {
        findUnique: vi.fn().mockResolvedValue({ membershipActive: false }),
      },
      stagingTesterGrant: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };

    await expect(
      resolveMembershipActive(client, 'user-1', 'tester@example.com'),
    ).resolves.toBe(false);
  });
});
