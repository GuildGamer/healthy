import type { CountryCode, MembershipCurrency } from '@product/contract';
import { pickPlanPrice } from '../../../shared/membership/membership-pricing.js';

type CatalogPrice = {
  marketKey: string;
  currency: MembershipCurrency;
  amountMinor: number;
};

/**
 * App Store prices are milliunits of the currency (1/1000).
 * Catalog and Subscription rows store integer minor units (cents / kobo).
 */
export function amountMinorFromAppleMilliunits(
  priceMilliunits: number | undefined,
  catalogAmountMinor: number,
): number {
  if (
    priceMilliunits === undefined ||
    !Number.isInteger(priceMilliunits) ||
    priceMilliunits <= 0
  ) {
    return catalogAmountMinor;
  }

  return Math.round(priceMilliunits / 10);
}

export function membershipCurrencyFromApple(
  currency: string | undefined,
): MembershipCurrency | null {
  if (currency === 'NGN' || currency === 'USD') {
    return currency;
  }

  return null;
}

export function snapshotApplePrice(
  transaction: {
    currency?: string;
    price?: number;
  },
  catalogPrices: CatalogPrice[],
  countryCode: CountryCode | null,
): { currency: MembershipCurrency; amountMinor: number } {
  const catalog = pickPlanPrice(catalogPrices, countryCode);
  const currency =
    membershipCurrencyFromApple(transaction.currency) ?? catalog.currency;

  return {
    currency,
    amountMinor: amountMinorFromAppleMilliunits(
      transaction.price,
      catalog.amountMinor,
    ),
  };
}
