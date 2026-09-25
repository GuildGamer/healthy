import { requireOptionalNativeModule } from 'expo-modules-core';

export const APPLE_MONTHLY_PRODUCT_ID = 'com.healthyapp.app.premium.month';

export function resolveAppleProductId(options: {
  planAppleProductId: string | null;
  offerAppleProductId: string | null;
  interval: 'month' | 'year';
}): string | null {
  return (
    options.planAppleProductId ??
    options.offerAppleProductId ??
    (options.interval === 'month' ? APPLE_MONTHLY_PRODUCT_ID : null)
  );
}

export function isAppleIapPlatform(os: string): boolean {
  return os === 'ios';
}

export const APPLE_IAP_REBUILD_MESSAGE =
  'This iOS install cannot take Apple payments yet. Rebuild the app and open it again.';

export const APPLE_PRODUCT_MISSING_MESSAGE =
  'This Apple membership is not on the App Store yet. Add the product in App Store Connect, then try again.';

const MISSING_STORE_PRODUCT_CODES = new Set([
  'sku-not-found',
  'item-unavailable',
  'query-product',
]);

export function isAppleIapNativeAvailable(): boolean {
  return requireOptionalNativeModule('ExpoIap') != null;
}

export function signedTransactionInfoFromPurchase(purchase: {
  purchaseToken?: string | null;
}): string | null {
  const token = purchase.purchaseToken?.trim();
  return token ? token : null;
}

function errorCodeOf(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return null;
  }

  return typeof error.code === 'string' ? error.code : null;
}

export function isUserCancelledPurchase(error: unknown): boolean {
  return errorCodeOf(error) === 'user-cancelled';
}

export function isMissingStoreProductError(error: unknown): boolean {
  const code = errorCodeOf(error);
  if (code && MISSING_STORE_PRODUCT_CODES.has(code)) {
    return true;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = error.message;
    if (typeof message === 'string') {
      return /product could not be found/i.test(message);
    }
  }

  return false;
}

export function storeListsProduct(
  products: Array<{ id: string }> | null,
  productId: string,
): boolean {
  return Boolean(products?.some((product) => product.id === productId));
}

export function latestRestorablePurchase<
  T extends {
    purchaseToken?: string | null;
    transactionDate: number;
  },
>(purchases: T[]): T | null {
  const restorable = [...purchases]
    .filter((purchase) => Boolean(purchase.purchaseToken?.trim()))
    .sort((left, right) => right.transactionDate - left.transactionDate);

  return restorable[0] ?? null;
}

export function messageFromPurchaseError(
  error: unknown,
  fallback: string,
): string {
  if (isMissingStoreProductError(error)) {
    return APPLE_PRODUCT_MISSING_MESSAGE;
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = error.message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }

  return fallback;
}
