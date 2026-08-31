import { MEMBERSHIP_DEFAULT_MARKET } from './membership.js';
import type { MembershipCurrency } from './membership.js';

/** Format minor units for display (kobo / cents). */
export function formatMembershipAmount(
  currency: MembershipCurrency,
  amountMinor: number,
): string {
  if (currency === 'NGN') {
    const naira = Math.trunc(amountMinor / 100);
    return `₦${naira.toLocaleString('en-NG')}`;
  }

  return `$${(amountMinor / 100).toFixed(2)}`;
}

export function resolveMembershipMarketKey(
  countryCode: string | null | undefined,
): string {
  return countryCode === 'NG' ? 'NG' : MEMBERSHIP_DEFAULT_MARKET;
}
