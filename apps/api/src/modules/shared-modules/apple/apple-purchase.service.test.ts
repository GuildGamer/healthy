import { Type } from '@apple/app-store-server-library';
import { describe, expect, it, vi } from 'vitest';
import { ApplePurchaseService } from './apple-purchase.service.js';
import type { AppleSignedDataVerifier } from './types/apple-signed-data.js';
import { SubscriptionLifecycleService } from '../subscriptions/subscription-lifecycle.service.js';
import { EntitlementService } from '../subscriptions/entitlement.service.js';

const expiresDate = Date.now() + 30 * 24 * 60 * 60 * 1000;
const purchaseDate = Date.now() - 60_000;

function decodedTransaction(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    originalTransactionId: 'orig-1',
    transactionId: 'txn-1',
    productId: 'com.healthyapp.app.premium.month',
    type: Type.AUTO_RENEWABLE_SUBSCRIPTION,
    purchaseDate,
    expiresDate,
    currency: 'NGN',
    price: 1_000_000,
    ...overrides,
  };
}

function createService(options: {
  verifier?: AppleSignedDataVerifier | null;
  prisma?: object;
  lifecycle?: Partial<SubscriptionLifecycleService>;
  entitlements?: Partial<EntitlementService>;
} = {}) {
  const verifier =
    options.verifier === undefined
      ? {
          verifyTransaction: vi.fn().mockResolvedValue(decodedTransaction()),
          verifyNotification: vi.fn(),
          verifyRenewalInfo: vi.fn(),
        }
      : options.verifier;

  const prisma = options.prisma ?? {
    membershipProduct: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'mp-1',
        planId: 'plan-month',
        plan: {
          interval: 'month',
          prices: [
            { marketKey: 'NG', currency: 'NGN', amountMinor: 100_000 },
            { marketKey: '*', currency: 'USD', amountMinor: 200 },
          ],
        },
      }),
    },
    subscription: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
    userProfile: {
      findUnique: vi.fn().mockResolvedValue({ countryCode: 'NG' }),
    },
  };

  const lifecycle = {
    applyPurchase: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'sub-1' },
    }),
    applyRenewal: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 'sub-1' },
    }),
    ...options.lifecycle,
  };

  const entitlements = {
    findCurrentSubscription: vi.fn().mockResolvedValue({
      currentPeriodEndsAt: new Date(expiresDate),
    }),
    hasActivePremium: vi.fn().mockResolvedValue(true),
    ...options.entitlements,
  };

  const service = new ApplePurchaseService(
    prisma as never,
    verifier,
    lifecycle as unknown as SubscriptionLifecycleService,
    entitlements as unknown as EntitlementService,
  );

  return { service, verifier, prisma, lifecycle, entitlements };
}

describe('ApplePurchaseService.syncForUser', () => {
  it('returns apple_disabled when the verifier is not configured', async () => {
    const { service } = createService({ verifier: null });

    await expect(service.syncForUser('user-1', 'jws')).resolves.toMatchObject({
      success: false,
      error: { code: 'apple_disabled' },
    });
  });

  it('binds a verified purchase to the signed-in user', async () => {
    const { service, lifecycle } = createService();

    const result = await service.syncForUser('user-1', 'signed-jws');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hasMembership).toBe(true);
    }
    expect(lifecycle.applyPurchase).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        provider: 'apple',
        providerSubscriptionId: 'orig-1',
        providerProductId: 'com.healthyapp.app.premium.month',
        amountMinor: 100_000,
        currency: 'NGN',
      }),
    );
  });

  it('rejects an Apple subscription already linked to another user', async () => {
    const { service, lifecycle } = createService({
      prisma: {
        membershipProduct: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'mp-1',
            planId: 'plan-month',
            plan: { interval: 'month', prices: [] },
          }),
        },
        subscription: {
          findUnique: vi.fn().mockResolvedValue({ userId: 'other-user' }),
        },
        userProfile: { findUnique: vi.fn() },
      },
    });

    await expect(service.syncForUser('user-1', 'jws')).resolves.toMatchObject({
      success: false,
      error: { code: 'subscription_linked_to_other_user' },
    });
    expect(lifecycle.applyPurchase).not.toHaveBeenCalled();
  });

  it('restores by renewing when the subscription is already bound to this user', async () => {
    const { service, lifecycle } = createService({
      prisma: {
        membershipProduct: {
          findUnique: vi.fn().mockResolvedValue({
            id: 'mp-1',
            planId: 'plan-month',
            plan: { interval: 'month', prices: [] },
          }),
        },
        subscription: {
          findUnique: vi.fn().mockResolvedValue({ userId: 'user-1' }),
        },
        userProfile: { findUnique: vi.fn() },
      },
    });

    const result = await service.syncForUser('user-1', 'jws');

    expect(result.success).toBe(true);
    expect(lifecycle.applyRenewal).toHaveBeenCalledWith(
      expect.objectContaining({
        providerSubscriptionId: 'orig-1',
        provider: 'apple',
      }),
    );
    expect(lifecycle.applyPurchase).not.toHaveBeenCalled();
  });

  it('maps a second live provider to duplicate_subscription', async () => {
    const { service } = createService({
      lifecycle: {
        applyPurchase: vi.fn().mockResolvedValue({
          success: false,
          error: { code: 'duplicate_subscription' },
        }),
      },
    });

    await expect(service.syncForUser('user-1', 'jws')).resolves.toMatchObject({
      success: false,
      error: { code: 'duplicate_subscription' },
    });
  });

  it('rejects an expired transaction', async () => {
    const { service } = createService({
      verifier: {
        verifyTransaction: vi.fn().mockResolvedValue(
          decodedTransaction({ expiresDate: Date.now() - 1_000 }),
        ),
        verifyNotification: vi.fn(),
        verifyRenewalInfo: vi.fn(),
      },
    });

    await expect(service.syncForUser('user-1', 'jws')).resolves.toMatchObject({
      success: false,
      error: { code: 'transaction_not_active' },
    });
  });
});
