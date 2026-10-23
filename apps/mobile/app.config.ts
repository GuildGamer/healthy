import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Host for universal / app links. The apex `gethealthyapp.com` 308s to www,
 * and iOS and Android will not open an app from a link that redirects, so
 * invites and this claim both use www. `/match/<token>` mirrors
 * `app/match/[token]`.
 *
 * `associatedDomains` and `intentFilters` are native. They apply only after
 * a new dev-client build (`make ios` / `make android`), not an EAS Update.
 */
const LINK_HOST = 'www.gethealthyapp.com';
/** Trailing slash matters: without it Android would also claim `/matches/...`. */
const MATCH_INVITE_PATH_PREFIX = '/match/';

/**
 * Canonical store IDs for your own Apple/Google account later.
 * Override for disposable TestFlight / friend-account builds so you do not
 * register the real ID on a team you will abandon (Apple App IDs stick to the
 * team that creates them).
 *
 * Example throwaway: IOS_BUNDLE_IDENTIFIER=com.healthyapp.tfpreview
 */
const IOS_BUNDLE_IDENTIFIER = process.env.IOS_BUNDLE_IDENTIFIER?.trim() || 'com.healthyapp.app';
const ANDROID_PACKAGE = process.env.ANDROID_PACKAGE?.trim() || 'com.healthyapp.app';
/** CFBundleVersion. Codemagic sets this before prebuild; local builds stay on 1. */
const IOS_BUILD_NUMBER = process.env.IOS_BUILD_NUMBER?.trim() || '1';
/** EAS project that hosts updates for this app. */
const EAS_PROJECT_ID = 'be6f70ce-9076-4d48-8d07-b841eb0dce17';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Healthy',
  slug: 'healthy',
  scheme: 'healthy',
  version: '1.0.0',
  runtimeVersion: {
    policy: 'appVersion',
  },
  updates: {
    url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
  },
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  icon: './assets/icon.png',
  ios: {
    supportsTablet: true,
    bundleIdentifier: IOS_BUNDLE_IDENTIFIER,
    buildNumber: IOS_BUILD_NUMBER,
    associatedDomains: [`applinks:${LINK_HOST}`],
    // Set once the App Store listing exists (numeric id from App Store Connect).
    // appStoreUrl: 'https://apps.apple.com/app/idXXXXXXXXX',
    infoPlist: {
      NSCameraUsageDescription:
        'Healthy uses the camera to prove gym sessions and count push-ups on this phone.',
      NSLocationWhenInUseUsageDescription:
        'Healthy uses your location to record walking and running routes.',
      NSLocationAlwaysAndWhenInUseUsageDescription:
        'Healthy uses your location in the background so a walk keeps measuring after you lock the phone.',
      NSLocationAlwaysUsageDescription:
        'Healthy uses your location in the background so a walk keeps measuring after you lock the phone.',
      NSMotionUsageDescription: 'Healthy uses motion data to count steps from this phone.',
      // Required by ActivityKit. Without this key, startActivity fails and the
      // lock-screen walk card never appears.
      NSSupportsLiveActivities: true,
      UIBackgroundModes: ['location'],
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/icon.png',
      backgroundColor: '#3DDC97',
    },
    package: ANDROID_PACKAGE,
    intentFilters: [
      {
        action: 'VIEW',
        // Verified against /.well-known/assetlinks.json, so an invite opens
        // the app directly instead of showing a chooser.
        autoVerify: true,
        category: ['BROWSABLE', 'DEFAULT'],
        data: [
          {
            scheme: 'https',
            host: LINK_HOST,
            pathPrefix: MATCH_INVITE_PATH_PREFIX,
          },
        ],
      },
    ],
    playStoreUrl: `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`,
    permissions: [
      'CAMERA',
      'ACCESS_COARSE_LOCATION',
      'ACCESS_FINE_LOCATION',
      'ACTIVITY_RECOGNITION',
    ],
  },
  plugins: [
    'expo-router',
    'expo-dev-client',
    'expo-secure-store',
    'expo-notifications',
    'expo-font',
    'expo-iap',
    [
      // Hands off to the animated `SplashScreen` component. The native splash
      // can follow the phone (Clinic white / Healthy night) but not a stored
      // Light or Dark choice — that arrives only after JS reads SecureStore.
      // Colours mirror `@product/brand`, which cannot be imported here because
      // the package resolves to a build output Expo CLI may not have yet.
      'expo-splash-screen',
      {
        backgroundColor: '#F5F6F8',
        image: './assets/splash-icon.png',
        imageWidth: 104,
        resizeMode: 'contain',
        dark: {
          backgroundColor: '#0B1220',
          image: './assets/splash-icon.png',
        },
      },
    ],
    [
      'expo-build-properties',
      {
        android: {
          minSdkVersion: 26,
        },
        ios: {
          deploymentTarget: '15.1',
          extraPods: [
            {
              name: 'QuickPoseCore',
              git: 'https://github.com/quickpose/quickpose-ios-sdk.git',
              tag: 'v1.7.0',
            },
            {
              name: 'QuickPoseCamera',
              git: 'https://github.com/quickpose/quickpose-ios-sdk.git',
              tag: 'v1.7.0',
            },
            {
              name: 'QuickPoseSwiftUI',
              git: 'https://github.com/quickpose/quickpose-ios-sdk.git',
              tag: 'v1.7.0',
            },
          ],
        },
      },
    ],
    [
      'react-native-vision-camera',
      {
        cameraPermissionText:
          'Healthy uses the camera to prove gym sessions and count push-ups on this phone.',
        enableMicrophonePermission: false,
      },
    ],
    [
      'react-native-fast-tflite',
      {
        enableCoreMLDelegate: true,
        enableAndroidGpuLibraries: true,
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission:
          'Healthy uses the camera to prove gym sessions and count push-ups on this phone.',
        recordAudioAndroid: false,
      },
    ],
    [
      'expo-image-picker',
      {
        cameraPermission: 'Healthy uses the camera for gym proof and your profile photo.',
        photosPermission: 'Healthy uses your photos so you can set a profile picture.',
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Healthy uses your location to record walking and running routes.',
        locationAlwaysAndWhenInUsePermission:
          'Healthy uses your location in the background so a walk keeps measuring after you lock the phone.',
        locationAlwaysPermission:
          'Healthy uses your location in the background so a walk keeps measuring after you lock the phone.',
        isIosBackgroundLocationEnabled: true,
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
      },
    ],
    // Widget extension for the lock-screen walk card. Only list this once —
    // applying it twice duplicates the Xcode target and breaks pod install.
    'expo-live-activity',
    // Overwrites the generated SwiftUI with Healthy’s deck-style Pause/Resume card.
    './modules/walk-live-activity/app.plugin.js',
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: EAS_PROJECT_ID,
    },
    /**
     * Numeric App Store id (not the bundle id). Required for the Profile
     * “Rate the app” write-review deep link on iOS. Leave unset until listed.
     * Do not set null — plist serialization turns null into {}, which is not a string.
     */
  },
});
