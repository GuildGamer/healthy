import type {
  MembershipCurrentSubscription,
  MembershipInterval,
  MembershipOfferedPlan,
} from '@product/contract';
import { STORE_SUBSCRIPTION_LINKS } from '@/constants/store-subscriptions';
import { formatDayMonthYear } from '@/lib/format-day';

const MONTHS_PER_YEAR = 12;

export const MEMBERSHIP_INTERVAL_NAME: Record<MembershipInterval, string> = {
  month: 'Monthly',
  year: 'Yearly',
};

export const MEMBERSHIP_INTERVAL_UNIT: Record<MembershipInterval, string> = {
  month: 'a month',
  year: 'a year',
};

/**
 * Whole months a yearly plan saves against twelve monthly payments, in the
 * same currency. Integer minor units throughout, so no rounding drift.
 */
export function yearlyMonthsFree(plans: readonly MembershipOfferedPlan[]): number {
  const monthly = plans.find((plan) => plan.interval === 'month');
  const yearly = plans.find((plan) => plan.interval === 'year');
  if (!monthly || !yearly || monthly.currency !== yearly.currency) {
    return 0;
  }

  const savedMinor = monthly.amountMinor * MONTHS_PER_YEAR - yearly.amountMinor;
  return Math.max(0, Math.floor(savedMinor / monthly.amountMinor));
}

export function monthsFreeLabel(monthsFree: number): string | null {
  if (monthsFree <= 0) {
    return null;
  }

  return monthsFree === 1 ? '1 month free' : `${monthsFree} months free`;
}

/** `Yearly · renews 3 Nov 2027`, or when access ends once renewal is off. */
export function memberEyebrow(subscription: MembershipCurrentSubscription | null): string {
  if (!subscription) {
    return 'Membership';
  }

  const endsOn = formatDayMonthYear(subscription.currentPeriodEndsAt);
  const timing = subscription.autoRenewing ? `renews ${endsOn}` : `ends ${endsOn}`;
  return `${MEMBERSHIP_INTERVAL_NAME[subscription.interval]} · ${timing}`;
}

/** The store owns cancelling, so the link goes there. A web plan has no store page. */
export function manageSubscriptionLink(
  subscription: MembershipCurrentSubscription | null,
): { label: string; url: string } | null {
  if (!subscription || subscription.provider === 'web') {
    return null;
  }

  const link = STORE_SUBSCRIPTION_LINKS[subscription.provider];
  return { label: link.label, url: link.url };
}

/** Plan copy comes from the admin; sentence punctuation reads calmer than dashes. */
export function punctuateMembershipCopy(value: string): string {
  return value
    .replace(/\s*[—–]\s*/g, '. ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\.\s*\./g, '.')
    .trim();
}
