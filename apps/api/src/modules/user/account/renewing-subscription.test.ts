import { describe, expect, it } from 'vitest';
import {
  renewingSubscriptionRefusal,
  type SubscriptionBillingState,
} from './renewing-subscription.js';

const now = new Date('2026-10-22T12:00:00.000Z');

function subscription(overrides: Partial<SubscriptionBillingState>): SubscriptionBillingState {
  return {
    provider: 'apple',
    status: 'active',
    autoRenewing: true,
    currentPeriodEndsAt: new Date('2026-11-03T09:00:00.000Z'),
    ...overrides,
  };
}

describe('renewingSubscriptionRefusal', () => {
  it('refuses while an active plan will renew, naming the store that bills it', () => {
    expect(renewingSubscriptionRefusal([subscription({ provider: 'google' })], now)).toEqual({
      reason: 'subscription_renewing',
      store: 'google',
      renewsAt: '2026-11-03T09:00:00.000Z',
    });
  });

  it('allows a plan the member already cancelled, even before it runs out', () => {
    expect(renewingSubscriptionRefusal([subscription({ autoRenewing: false })], now)).toBeNull();
  });

  it('allows plans that ended, expired or were revoked', () => {
    const finished = [
      subscription({ status: 'expired' }),
      subscription({ status: 'revoked' }),
      subscription({ status: 'cancelled' }),
      subscription({ currentPeriodEndsAt: new Date('2026-10-01T00:00:00.000Z') }),
    ];
    expect(renewingSubscriptionRefusal(finished, now)).toBeNull();
  });

  it('still refuses while the store retries a failed charge after the period ended', () => {
    const retrying = subscription({
      status: 'billing_retry',
      currentPeriodEndsAt: new Date('2026-10-20T00:00:00.000Z'),
    });
    expect(renewingSubscriptionRefusal([retrying], now)?.store).toBe('apple');
  });

  it('allows an account with no plan at all', () => {
    expect(renewingSubscriptionRefusal([], now)).toBeNull();
  });
});
