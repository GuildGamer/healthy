import type {
  MembershipCurrency,
  MembershipPaymentMethodId,
  MembershipOffer,
} from '@product/contract';
import {
  MEMBERSHIP_DEFAULT_MARKET,
  type CountryCode,
} from '@product/contract';

const METHOD_COPY: Record<
  MembershipPaymentMethodId,
  { label: string; hint: string }
> = {
  apple_pay: { label: 'Apple Pay', hint: 'Face ID or Touch ID' },
  google_pay: { label: 'Google Pay', hint: 'One tap' },
  card: { label: 'Card', hint: 'Visa or Mastercard' },
  bank_transfer: { label: 'Bank transfer', hint: 'Pay into account' },
  ussd: { label: 'USSD', hint: 'Dial from your phone' },
};

const NG_METHODS: readonly MembershipPaymentMethodId[] = [
  'card',
  'bank_transfer',
  'ussd',
  'apple_pay',
  'google_pay',
];

const USD_METHODS: readonly MembershipPaymentMethodId[] = [
  'apple_pay',
  'google_pay',
  'card',
];

export function defaultPaymentMethodIdsForCountry(
  countryCode: CountryCode | null,
): MembershipPaymentMethodId[] {
  if (countryCode === 'NG') {
    return [...NG_METHODS];
  }

  return [...USD_METHODS];
}

export function resolveMarketKey(countryCode: CountryCode | null): string {
  if (countryCode === 'NG') {
    return 'NG';
  }

  return MEMBERSHIP_DEFAULT_MARKET;
}

export function pickPlanPrice(
  prices: readonly {
    marketKey: string;
    currency: MembershipCurrency;
    amountMinor: number;
  }[],
  countryCode: CountryCode | null,
): {
  marketKey: string;
  currency: MembershipCurrency;
  amountMinor: number;
} {
  const marketKey = resolveMarketKey(countryCode);
  const exact = prices.find((price) => price.marketKey === marketKey);
  if (exact) {
    return exact;
  }

  const fallback = prices.find(
    (price) => price.marketKey === MEMBERSHIP_DEFAULT_MARKET,
  );
  if (fallback) {
    return fallback;
  }

  const first = prices[0];
  if (!first) {
    throw new Error('Membership plan has no prices');
  }

  return first;
}

export function paymentMethodsForOffer(
  planMethodIds: readonly string[],
  countryCode: CountryCode | null,
): MembershipOffer['paymentMethods'] {
  const ids =
    planMethodIds.length > 0
      ? (planMethodIds as MembershipPaymentMethodId[])
      : defaultPaymentMethodIdsForCountry(countryCode);

  return ids.map((id) => ({
    id,
    label: METHOD_COPY[id]?.label ?? id,
    hint: METHOD_COPY[id]?.hint ?? '',
  }));
}
