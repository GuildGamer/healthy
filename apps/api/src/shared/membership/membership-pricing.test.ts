import { describe, expect, it } from 'vitest';
import { MEMBERSHIP_DEFAULT_MARKET } from '@product/contract';
import {
  defaultPaymentMethodIdsForCountry,
  pickPlanPrice,
} from './membership-pricing.js';

describe('membership pricing resolve', () => {
  const prices = [
    { marketKey: 'NG', currency: 'NGN' as const, amountMinor: 100_000 },
    {
      marketKey: MEMBERSHIP_DEFAULT_MARKET,
      currency: 'USD' as const,
      amountMinor: 200,
    },
  ];

  it('picks NGN for Nigeria', () => {
    expect(pickPlanPrice(prices, 'NG')).toEqual(prices[0]);
  });

  it('picks USD default for other countries', () => {
    expect(pickPlanPrice(prices, 'US')).toEqual(prices[1]);
    expect(pickPlanPrice(prices, null)).toEqual(prices[1]);
  });

  it('orders Nigeria methods with local rails first', () => {
    expect(defaultPaymentMethodIdsForCountry('NG')[0]).toBe('card');
    expect(defaultPaymentMethodIdsForCountry('NG')).toContain('ussd');
  });

  it('orders USD markets with wallets first', () => {
    expect(defaultPaymentMethodIdsForCountry('US')[0]).toBe('apple_pay');
  });
});
