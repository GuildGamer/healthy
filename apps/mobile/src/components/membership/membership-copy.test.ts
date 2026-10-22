import type { MembershipCurrentSubscription, MembershipOfferedPlan } from '@product/contract';
import {
  manageSubscriptionLink,
  memberEyebrow,
  monthsFreeLabel,
  yearlyMonthsFree,
} from './membership-copy';

function plan(overrides: Partial<MembershipOfferedPlan>): MembershipOfferedPlan {
  return {
    planId: 'plan-month',
    slug: 'healthy',
    name: 'Healthy',
    tagline: 'Every challenge',
    features: ['The full challenge catalog'],
    interval: 'month',
    headline: null,
    ctaLabel: null,
    currency: 'NGN',
    amountMinor: 250_000,
    appleProductId: null,
    ...overrides,
  };
}

const subscription: MembershipCurrentSubscription = {
  id: 'sub-1',
  planId: 'plan-year',
  interval: 'year',
  provider: 'apple',
  status: 'active',
  autoRenewing: true,
  currentPeriodEndsAt: '2027-11-03T09:00:00.000Z',
  cancelledAt: null,
  currency: 'NGN',
  amountMinor: 2_500_000,
};

describe('yearly saving', () => {
  it('counts whole months saved against twelve monthly payments', () => {
    const plans = [
      plan({}),
      plan({ planId: 'plan-year', interval: 'year', amountMinor: 2_500_000 }),
    ];
    expect(yearlyMonthsFree(plans)).toBe(2);
    expect(monthsFreeLabel(2)).toBe('2 months free');
  });

  it('shows nothing without both plans or with mixed currencies', () => {
    expect(yearlyMonthsFree([plan({})])).toBe(0);
    expect(
      yearlyMonthsFree([plan({}), plan({ interval: 'year', currency: 'USD', amountMinor: 2_000 })]),
    ).toBe(0);
    expect(monthsFreeLabel(0)).toBeNull();
  });

  it('never claims a saving when yearly costs more', () => {
    const plans = [plan({}), plan({ interval: 'year', amountMinor: 4_000_000 })];
    expect(yearlyMonthsFree(plans)).toBe(0);
  });
});

describe('member copy', () => {
  it('says when the plan renews', () => {
    expect(memberEyebrow(subscription)).toBe('Yearly · renews 3 Nov 2027');
  });

  it('says when access ends once renewal is off', () => {
    expect(memberEyebrow({ ...subscription, autoRenewing: false })).toBe(
      'Yearly · ends 3 Nov 2027',
    );
  });

  it('links to the store that bills the plan', () => {
    expect(manageSubscriptionLink(subscription)?.label).toBe('Manage in the App Store');
    expect(manageSubscriptionLink({ ...subscription, provider: 'google' })?.label).toBe(
      'Manage in Google Play',
    );
    expect(manageSubscriptionLink({ ...subscription, provider: 'web' })).toBeNull();
    expect(manageSubscriptionLink(null)).toBeNull();
  });
});
