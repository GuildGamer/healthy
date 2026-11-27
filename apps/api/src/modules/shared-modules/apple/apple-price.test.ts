import { describe, expect, it } from 'vitest';
import {
  amountMinorFromAppleMilliunits,
  membershipCurrencyFromApple,
  snapshotApplePrice,
} from './apple-price.js';

describe('Apple price snapshot', () => {
  const catalog = [
    { marketKey: 'NG', currency: 'NGN' as const, amountMinor: 100_000 },
    { marketKey: '*', currency: 'USD' as const, amountMinor: 200 },
  ];

  it('converts Apple milliunits to minor units', () => {
    expect(amountMinorFromAppleMilliunits(1_000_000, 100_000)).toBe(100_000);
    expect(amountMinorFromAppleMilliunits(1990, 200)).toBe(199);
    expect(amountMinorFromAppleMilliunits(undefined, 200)).toBe(200);
  });

  it('accepts NGN and USD from Apple and otherwise uses the catalog', () => {
    expect(membershipCurrencyFromApple('NGN')).toBe('NGN');
    expect(membershipCurrencyFromApple('EUR')).toBeNull();
    expect(
      snapshotApplePrice({ currency: 'EUR', price: 5000 }, catalog, 'NG'),
    ).toEqual({ currency: 'NGN', amountMinor: 500 });
  });
});
