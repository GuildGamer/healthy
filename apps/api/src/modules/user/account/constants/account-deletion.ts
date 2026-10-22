import type { SubscriptionStatus } from '@product/db';

/** What groups and their finished boards show in place of a deleted member. */
export const FORMER_MEMBER_NAME = 'Former member';

/**
 * The tombstone's address. `.invalid` can never receive mail (RFC 2606), and
 * moving off the real address is what lets that email sign up again.
 */
export function tombstoneEmailFor(userId: string): string {
  return `deleted-${userId}@deleted.invalid`;
}

/** A store keeps billing in these states until the member cancels. */
export const STILL_BILLING_SUBSCRIPTION_STATUSES: readonly SubscriptionStatus[] = [
  'active',
  'grace_period',
  'billing_retry',
];

export const ACCOUNT_DELETION_REFUSED_MESSAGE =
  'Your membership still renews. Cancel it first, then delete your account.';
