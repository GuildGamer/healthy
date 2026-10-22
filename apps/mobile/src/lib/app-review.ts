import Constants from 'expo-constants';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { Linking, Platform } from 'react-native';

const ANDROID_PACKAGE = 'com.healthyapp.app';

type StoreReviewModule = {
  hasAction: () => Promise<boolean>;
  requestReview: () => Promise<void>;
};

export function isStoreReviewNativeAvailable(): boolean {
  return requireOptionalNativeModule('ExpoStoreReview') != null;
}

async function loadStoreReviewModule(): Promise<StoreReviewModule | null> {
  try {
    // Deferred require keeps this file import-safe when ExpoStoreReview is
    // absent. Prefer require so Jest mocks apply (dynamic import does not).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-store-review') as StoreReviewModule;
  } catch {
    return null;
  }
}

function appleAppStoreId(): string | null {
  const extra = Constants.expoConfig?.extra as Record<string, unknown> | undefined;
  const id = extra?.appleAppStoreId;
  if (typeof id !== 'string') {
    return null;
  }

  const trimmed = id.trim();
  return trimmed ? trimmed : null;
}

/**
 * Write-review deep link for a user-initiated Profile action.
 * Returns null on iOS until `extra.appleAppStoreId` is set.
 */
export function writeReviewUrl(): string | null {
  if (Platform.OS === 'ios') {
    const id = appleAppStoreId();
    if (!id) {
      return null;
    }

    return `itms-apps://itunes.apple.com/app/viewContentsUserReviews/id${id}?action=write-review`;
  }

  if (Platform.OS === 'android') {
    return `market://details?id=${ANDROID_PACKAGE}&showAllReviews=true`;
  }

  return null;
}

export function canOpenWriteReviewPage(): boolean {
  return writeReviewUrl() != null;
}

export async function openWriteReviewPage(): Promise<boolean> {
  const url = writeReviewUrl();
  if (!url) {
    return false;
  }

  const supported = await Linking.canOpenURL(url);
  if (!supported) {
    return false;
  }

  await Linking.openURL(url);
  return true;
}

/**
 * Ask the OS to show the in-app App Store / Play review sheet.
 * Fail closed when the native module is missing (stale JS-only install).
 * The OS may silently no-op (quota, TestFlight, already reviewed).
 */
export async function requestInAppReview(): Promise<boolean> {
  if (!isStoreReviewNativeAvailable()) {
    return false;
  }

  const storeReview = await loadStoreReviewModule();
  if (!storeReview) {
    return false;
  }

  if (!(await storeReview.hasAction())) {
    return false;
  }

  await storeReview.requestReview();
  return true;
}
