import {
  readAccountDeletionRefusal,
  type AccountDeletionRefusal,
} from '@product/contract/account-deletion';
import { STORE_SUBSCRIPTION_LINKS } from '@/constants/store-subscriptions';
import { formatDayMonth } from '@/lib/format-day';

export const ACCOUNT_DELETION_FAILED_MESSAGE =
  'Couldn’t delete your account. Check your connection and try again.';

/** The store whose plan has to be cancelled first, as the phone reads it. */
export function membershipStoreName(platformOs: string): string {
  return platformOs === 'android'
    ? STORE_SUBSCRIPTION_LINKS.google.storeName
    : STORE_SUBSCRIPTION_LINKS.apple.storeName;
}

/** The refusal the API sends while a plan still renews, from an error of any shape. */
export function refusalFrom(error: unknown): AccountDeletionRefusal | null {
  if (!error || typeof error !== 'object' || !('data' in error)) {
    return null;
  }

  return readAccountDeletionRefusal(error.data);
}

export function refusalMessage(refusal: AccountDeletionRefusal): string {
  const renewsOn = formatDayMonth(refusal.renewsAt);
  if (refusal.store === 'web') {
    return `Your membership renews on ${renewsOn}. Cancel it first, then delete your account.`;
  }

  const storeName = STORE_SUBSCRIPTION_LINKS[refusal.store].storeName;
  return `Your membership renews on ${renewsOn}. Cancel it in ${storeName} first, then delete your account.`;
}

/** Where to cancel, or null when the plan has no store page. */
export function refusalLink(
  refusal: AccountDeletionRefusal,
): { label: string; url: string } | null {
  if (refusal.store === 'web') {
    return null;
  }

  const link = STORE_SUBSCRIPTION_LINKS[refusal.store];
  return { label: link.label, url: link.url };
}
