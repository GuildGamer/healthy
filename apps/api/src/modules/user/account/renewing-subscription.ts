import type { SubscriptionProvider, SubscriptionStatus } from '@product/db';
import { ACCOUNT_DELETION_SUBSCRIPTION_RENEWING } from '@product/contract';
import { STILL_BILLING_SUBSCRIPTION_STATUSES } from './constants/account-deletion.js';
import type { AccountDeletionError } from './errors/account-deletion.error.js';

export type SubscriptionBillingState = {
  provider: SubscriptionProvider;
  status: SubscriptionStatus;
  autoRenewing: boolean;
  currentPeriodEndsAt: Date;
};

/**
 * Grace and billing-retry plans sit past their period end while the store
 * keeps trying to charge, so only an active plan is judged by its date.
 */
function willBillAgain(subscription: SubscriptionBillingState, now: Date): boolean {
  if (!subscription.autoRenewing) {
    return false;
  }

  if (!STILL_BILLING_SUBSCRIPTION_STATUSES.includes(subscription.status)) {
    return false;
  }

  if (subscription.status !== 'active') {
    return true;
  }

  return subscription.currentPeriodEndsAt.getTime() > now.getTime();
}

/**
 * The plan that would bill again after the account is gone, if any. A
 * cancelled-but-paid-up plan is fine: it simply runs out.
 */
export function renewingSubscriptionRefusal(
  subscriptions: readonly SubscriptionBillingState[],
  now: Date,
): AccountDeletionError | null {
  const next = subscriptions
    .filter((subscription) => willBillAgain(subscription, now))
    .sort(
      (first, second) => first.currentPeriodEndsAt.getTime() - second.currentPeriodEndsAt.getTime(),
    )[0];

  if (!next) {
    return null;
  }

  return {
    reason: ACCOUNT_DELETION_SUBSCRIPTION_RENEWING,
    store: next.provider,
    renewsAt: next.currentPeriodEndsAt.toISOString(),
  };
}
