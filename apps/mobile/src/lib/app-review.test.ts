import { Linking, Platform } from 'react-native';
import * as StoreReview from 'expo-store-review';
import { requireOptionalNativeModule } from 'expo-modules-core';
import {
  canOpenWriteReviewPage,
  isStoreReviewNativeAvailable,
  openWriteReviewPage,
  requestInAppReview,
  writeReviewUrl,
} from './app-review';

jest.mock('expo-modules-core', () => {
  const actual = jest.requireActual('expo-modules-core') as object;
  return {
    ...actual,
    requireOptionalNativeModule: jest.fn(),
  };
});

jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      appleAppStoreId: undefined as unknown,
    },
  },
}));

const mockedRequire = requireOptionalNativeModule as jest.MockedFunction<
  typeof requireOptionalNativeModule
>;

function setPlatformOs(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    get: () => os,
  });
}

function setAppleAppStoreId(value: unknown) {
  const constants = require('expo-constants') as {
    expoConfig: { extra: { appleAppStoreId: unknown } };
  };
  constants.expoConfig.extra.appleAppStoreId = value;
}

describe('app-review', () => {
  const originalOs = Platform.OS;

  afterEach(() => {
    setPlatformOs(originalOs);
    jest.clearAllMocks();
    setAppleAppStoreId(undefined);
  });

  it('treats a missing native module as unavailable', () => {
    mockedRequire.mockReturnValue(null);
    expect(isStoreReviewNativeAvailable()).toBe(false);
  });

  it('no-ops requestInAppReview when the native module is missing', async () => {
    mockedRequire.mockReturnValue(null);
    await expect(requestInAppReview()).resolves.toBe(false);
    expect(StoreReview.requestReview).not.toHaveBeenCalled();
  });

  it('requests a review when the native module and hasAction are ready', async () => {
    mockedRequire.mockReturnValue({});
    (StoreReview.hasAction as jest.Mock).mockResolvedValue(true);

    await expect(requestInAppReview()).resolves.toBe(true);
    expect(StoreReview.requestReview).toHaveBeenCalled();
  });

  it('builds an Android write-review market URL', () => {
    setPlatformOs('android');

    expect(writeReviewUrl()).toBe(
      'market://details?id=com.healthyapp.app&showAllReviews=true',
    );
    expect(canOpenWriteReviewPage()).toBe(true);
  });

  it('hides the iOS write-review link until the App Store id is set', () => {
    setPlatformOs('ios');

    expect(writeReviewUrl()).toBeNull();
    expect(canOpenWriteReviewPage()).toBe(false);
  });

  it('hides the iOS write-review link when appleAppStoreId serializes as {}', () => {
    setPlatformOs('ios');
    setAppleAppStoreId({});

    expect(writeReviewUrl()).toBeNull();
    expect(canOpenWriteReviewPage()).toBe(false);
  });

  it('builds an iOS write-review URL when the App Store id is set', () => {
    setPlatformOs('ios');
    setAppleAppStoreId('1234567890');

    expect(writeReviewUrl()).toBe(
      'itms-apps://itunes.apple.com/app/viewContentsUserReviews/id1234567890?action=write-review',
    );
  });

  it('opens the write-review page when Linking allows it', async () => {
    setPlatformOs('android');
    const canOpen = jest
      .spyOn(Linking, 'canOpenURL')
      .mockResolvedValue(true);
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

    await expect(openWriteReviewPage()).resolves.toBe(true);
    expect(open).toHaveBeenCalledWith(
      'market://details?id=com.healthyapp.app&showAllReviews=true',
    );

    canOpen.mockRestore();
    open.mockRestore();
  });
});
