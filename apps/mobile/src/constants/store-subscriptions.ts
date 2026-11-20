import type { AccountDeletionBillingStore } from '@product/contract/account-deletion';

/** The stores own cancelling, so these open their subscription pages. A web plan has none. */
export const STORE_SUBSCRIPTION_LINKS: Record<
  Exclude<AccountDeletionBillingStore, 'web'>,
  { storeName: string; label: string; url: string }
> = {
  apple: {
    storeName: 'the App Store',
    label: 'Manage in the App Store',
    url: 'https://apps.apple.com/account/subscriptions',
  },
  google: {
    storeName: 'Google Play',
    label: 'Manage in Google Play',
    url: 'https://play.google.com/store/account/subscriptions',
  },
};
