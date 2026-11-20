import { describe, expect, it } from '@jest/globals';
import { requireOptionalNativeModule } from 'expo-modules-core';
import {
  APPLE_MONTHLY_PRODUCT_ID,
  APPLE_PRODUCT_MISSING_MESSAGE,
  isAppleIapNativeAvailable,
  isAppleIapPlatform,
  isMissingStoreProductError,
  isUserCancelledPurchase,
  latestRestorablePurchase,
  messageFromPurchaseError,
  resolveAppleProductId,
  signedTransactionInfoFromPurchase,
  storeListsProduct,
} from './apple-membership';

jest.mock('expo-modules-core', () => ({
  requireOptionalNativeModule: jest.fn(() => null),
}));

const requireOptionalNativeModuleMock = jest.mocked(requireOptionalNativeModule);

describe('apple membership helpers', () => {
  it('treats iOS as the Apple IAP platform', () => {
    expect(isAppleIapPlatform('ios')).toBe(true);
    expect(isAppleIapPlatform('android')).toBe(false);
  });

  it('falls back to the monthly Apple SKU when the offer has none', () => {
    expect(
      resolveAppleProductId({
        planAppleProductId: null,
        offerAppleProductId: null,
        interval: 'month',
      }),
    ).toBe(APPLE_MONTHLY_PRODUCT_ID);
    expect(
      resolveAppleProductId({
        planAppleProductId: null,
        offerAppleProductId: null,
        interval: 'year',
      }),
    ).toBeNull();
  });

  it('reports StoreKit only when the ExpoIap native module is linked', () => {
    requireOptionalNativeModuleMock.mockReturnValueOnce(null);
    expect(isAppleIapNativeAvailable()).toBe(false);
    requireOptionalNativeModuleMock.mockReturnValueOnce({});
    expect(isAppleIapNativeAvailable()).toBe(true);
  });

  it('reads the StoreKit JWS from the unified purchase token', () => {
    expect(signedTransactionInfoFromPurchase({ purchaseToken: ' eyJhbGciOi ' })).toBe('eyJhbGciOi');
    expect(signedTransactionInfoFromPurchase({ purchaseToken: null })).toBeNull();
  });

  it('maps missing StoreKit products to a clear membership message', () => {
    expect(isMissingStoreProductError({ code: 'sku-not-found' })).toBe(true);
    expect(
      isMissingStoreProductError({
        message: 'Requested product could not be found',
      }),
    ).toBe(true);
    expect(
      messageFromPurchaseError(
        { code: 'sku-not-found', message: 'Requested product could not be found' },
        'fallback',
      ),
    ).toBe(APPLE_PRODUCT_MISSING_MESSAGE);
    expect(storeListsProduct([{ id: APPLE_MONTHLY_PRODUCT_ID }], APPLE_MONTHLY_PRODUCT_ID)).toBe(
      true,
    );
    expect(storeListsProduct([], APPLE_MONTHLY_PRODUCT_ID)).toBe(false);
  });

  it('ignores user-cancelled StoreKit errors', () => {
    expect(isUserCancelledPurchase({ code: 'user-cancelled' })).toBe(true);
    expect(isUserCancelledPurchase({ code: 'unknown' })).toBe(false);
  });

  it('picks the newest purchase that still has a JWS', () => {
    expect(
      latestRestorablePurchase([
        { purchaseToken: null, transactionDate: 30 },
        { purchaseToken: 'older', transactionDate: 10 },
        { purchaseToken: 'newer', transactionDate: 20 },
      ])?.purchaseToken,
    ).toBe('newer');
  });
});
