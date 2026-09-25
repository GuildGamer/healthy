import { describe, expect, it, vi } from 'vitest';
import { MembershipOfferService } from './membership-offer.service.js';
import { EntitlementService } from '../../shared-modules/subscriptions/entitlement.service.js';

const user = { id: 'u1', email: 'a@b.co', name: 'Ada' };

describe('MembershipOfferService', () => {
  it('returns every active plan and keeps the first as the default offer', async () => {
    const prisma = {
      userProfile: {
        findUnique: vi.fn().mockResolvedValue({
          countryCode: 'NG',
          membershipActive: false,
        }),
      },
      membershipPlan: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'plan-month',
            slug: 'healthy-starter',
            name: 'Healthy',
            tagline: 'Monthly',
            features: ['Catalog'],
            interval: 'month',
            headline: 'Stay a step ahead',
            ctaLabel: null,
            paymentMethodIds: [],
            prices: [
              { marketKey: 'NG', currency: 'NGN', amountMinor: 100_000 },
            ],
            products: [
              {
                provider: 'apple',
                providerProductId: 'com.healthyapp.app.premium.month',
                marketKey: '*',
              },
            ],
          },
          {
            id: 'plan-year',
            slug: 'healthy-starter-year',
            name: 'Healthy yearly',
            tagline: 'Yearly',
            features: ['Catalog'],
            interval: 'year',
            headline: null,
            ctaLabel: null,
            paymentMethodIds: [],
            prices: [
              { marketKey: 'NG', currency: 'NGN', amountMinor: 1_000_000 },
            ],
            products: [],
          },
        ]),
      },
    };

    const entitlements = {
      findCurrentSubscription: vi.fn().mockResolvedValue(null),
    };

    const service = new MembershipOfferService(
      prisma as never,
      entitlements as unknown as EntitlementService,
    );

    const offer = await service.getOffer(user);

    expect(offer.planId).toBe('plan-month');
    expect(offer.interval).toBe('month');
    expect(offer.amountMinor).toBe(100_000);
    expect(offer.plans).toHaveLength(2);
    expect(offer.plans[1]?.interval).toBe('year');
    expect(offer.plans[1]?.amountMinor).toBe(1_000_000);
    expect(offer.currentSubscription).toBeNull();
    expect(offer.hasMembership).toBe(false);
    expect(offer.appleProductId).toBe('com.healthyapp.app.premium.month');
    expect(offer.plans[0]?.appleProductId).toBe(
      'com.healthyapp.app.premium.month',
    );
    expect(offer.plans[1]?.appleProductId).toBeNull();
  });

  it('includes the current subscription when Premium is active', async () => {
    const prisma = {
      userProfile: {
        findUnique: vi.fn().mockResolvedValue({
          countryCode: 'NG',
          membershipActive: true,
        }),
      },
      membershipPlan: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'plan-month',
            slug: 'healthy-starter',
            name: 'Healthy',
            tagline: 'Monthly',
            features: ['Catalog'],
            interval: 'month',
            headline: null,
            ctaLabel: null,
            paymentMethodIds: [],
            prices: [
              { marketKey: 'NG', currency: 'NGN', amountMinor: 100_000 },
            ],
            products: [],
          },
        ]),
      },
    };

    const entitlements = {
      findCurrentSubscription: vi.fn().mockResolvedValue({
        id: 'sub-1',
        planId: 'plan-month',
        interval: 'month',
        provider: 'apple',
        status: 'cancelled',
        autoRenewing: false,
        currentPeriodEndsAt: new Date('2026-10-16T00:00:00.000Z'),
        cancelledAt: new Date('2026-09-20T00:00:00.000Z'),
        currency: 'NGN',
        amountMinor: 100_000,
      }),
    };

    const service = new MembershipOfferService(
      prisma as never,
      entitlements as unknown as EntitlementService,
    );

    const offer = await service.getOffer(user);

    expect(offer.hasMembership).toBe(true);
    expect(offer.currentSubscription?.autoRenewing).toBe(false);
    expect(offer.currentSubscription?.currentPeriodEndsAt).toBe(
      '2026-10-16T00:00:00.000Z',
    );
  });
});
