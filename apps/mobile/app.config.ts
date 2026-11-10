import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Host for universal / app links. The apex `gethealthyapp.com` 308s to www,
 * and iOS and Android will not open an app from a link that redirects, so
 * invites and this claim both use www. `/match/<token>` mirrors
 * `app/match/[token]`. `/progress/report` is the recap email. `/app/progress/report`
 * is the path older mail used; `path` is exact so it does not also claim
 * `/progress/reports`.
 *
 * `associatedDomains` and `intentFilters` are native. They apply only after
 * a new dev-client build (`make ios` / `make android`), not an EAS Update.
 */
const LINK_HOST = 'www.gethealthyapp.com';
/** Trailing slash matters: without it Android would also claim `/matches/...`. */
const MATCH_INVITE_PATH_PREFIX = '/match/';
const PROOF_VERIFY_PATH_PREFIX = '/v/';
const REPORT_PATH = '/progress/report';
const LEGACY_REPORT_PATH = '/app/progress/report';

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
/**
 * Path to the Firebase `google-services.json` that Android needs for push
 * tokens (FCM). On EAS it comes from a `file` environment variable, so the
 * file stays out of git; locally, point it at a downloaded copy. Without it
 * the build still succeeds, but Android installs get no reminders.
 */
const GOOGLE_SERVICES_FILE = process.env.GOOGLE_SERVICES_JSON?.trim() || undefined;
/**
 * Maps SDK for Android API key for `react-native-maps` tiles in release APKs.
 * Not Firebase — that is `GOOGLE_SERVICES_JSON`. On EAS, set this as a secret
 * on the `production` environment so `production-apk` can bake it in at
 * prebuild. Without it the walk map strip paints solid navy and shows no tiles.
 */
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY?.trim() || undefined;
/** EAS project that hosts updates for this app. */
const EAS_PROJECT_ID = 'be6f70ce-9076-4d48-8d07-b841eb0dce17';

if (process.env.EAS_BUILD && !GOOGLE_MAPS_API_KEY) {
  console.warn(
    '[app.config] GOOGLE_MAPS_API_KEY is unset; Android walk maps will show blank tiles in this build.',
  );
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Healthy',
  slug: 'healthy',
  scheme: 'healthy',
  version: '1.0.0',
  // Fingerprint changes when native deps, plugins, or modules change, so an
  // OTA cannot land on a binary that lacks the native code the JS expects.
  // Stale installs already on store still report appVersion "1.0.0" — publish
  // their safety-net update with `--runtime-version 1.0.0` before relying on
  // fingerprint-only channels.
  runtimeVersion: {
    policy: 'fingerprint',
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
        'Healthy uses the camera to count reps on this phone and optionally record a proof clip of your set.',
      NSPhotoLibraryAddUsageDescription:
        'Healthy saves proof clips you choose to keep in your Photos library.',
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
    entitlements: {
      'com.apple.developer.healthkit': true,
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/icon.png',
      backgroundColor: '#3DDC97',
    },
    // Resize the window when the soft keyboard opens so focused fields stay visible.
    // Requires a new native build; EAS Update alone does not apply this.
    softwareKeyboardLayoutMode: 'resize',
    package: ANDROID_PACKAGE,
    googleServicesFile: GOOGLE_SERVICES_FILE,
    config: {
      googleMaps: {
        apiKey: GOOGLE_MAPS_API_KEY,
      },
    },
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
          {
            scheme: 'https',
            host: LINK_HOST,
            pathPrefix: PROOF_VERIFY_PATH_PREFIX,
          },
          {
            scheme: 'https',
            host: LINK_HOST,
            path: REPORT_PATH,
          },
          {
            scheme: 'https',
            host: LINK_HOST,
            path: LEGACY_REPORT_PATH,
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
      // Health Connect reads (declared; runtime grant via the library).
      'android.permission.health.READ_SLEEP',
      'android.permission.health.READ_EXERCISE',
    ],
    // Plugins add these by default, but Healthy records no audio, and saving
    // clips or picking a profile photo needs no media read access on Android
    // 13+ (system photo picker, add-only saves). Play reviews broad photo and
    // video access, so keep them out. Android 12 and older still use
    // READ/WRITE_EXTERNAL_STORAGE for the same two flows.
    blockedPermissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.READ_MEDIA_AUDIO',
      'android.permission.READ_MEDIA_IMAGES',
      'android.permission.READ_MEDIA_VIDEO',
      'android.permission.READ_MEDIA_VISUAL_USER_SELECTED',
    ],
  },
  plugins: [
    'expo-router',
    'expo-dev-client',
    'expo-secure-store',
    'expo-notifications',
    'expo-font',
    'expo-iap',
    'expo-video',
    [
      'expo-media-library',
      {
        photosPermission: false,
        savePhotosPermission:
          'Healthy saves proof clips you choose to keep in your Photos library.',
        isAccessMediaLocationEnabled: false,
      },
    ],
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
          // QuickPose's MediaPipe AAR bundles its own C++ runtime beside
          // React Native's; without this the APK fails to package.
          packagingOptions: {
            pickFirst: ['**/libc++_shared.so'],
          },
          enableMinifyInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
          // Same rules as modules/quickpose-camera/android/proguard-rules.pro —
          // EAS prebuild injects these into android/app/proguard-rules.pro.
          // Verify push-ups on a fresh production-apk; OTA cannot apply them.
          extraProguardRules: [
            '-keep public interface com.google.mediapipe.framework.* {',
            '  public *;',
            '}',
            '-keep public class com.google.mediapipe.framework.Packet {',
            '  public static *** create(***);',
            '  public long getNativeHandle();',
            '  public void release();',
            '}',
            '-keep public class com.google.mediapipe.framework.PacketCreator {',
            '  *** releaseWithSyncToken(...);',
            '}',
            '-keep public class com.google.mediapipe.framework.MediaPipeException {',
            '  <init>(int, byte[]);',
            '}',
            '-keep class com.google.mediapipe.framework.ProtoUtil$SerializedMessage { *; }',
            '-keep public class * extends com.google.protobuf.GeneratedMessageLite { *; }',
            '-keepclassmembers class com.google.common.flogger.** { *; }',
            '-keep class ai.quickpose.core.Status$* { *; }',
          ].join('\n'),
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
        microphonePermission: false,
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
    [
      '@kingstinct/react-native-healthkit',
      {
        NSHealthShareUsageDescription:
          'Healthy reads walks and last night’s sleep from Apple Health so you can confirm them in one tap.',
        // Apple still requires this string when the HealthKit entitlement is present,
        // even though Healthy only reads health data and never writes to the store.
        NSHealthUpdateUsageDescription:
          'Healthy does not write sleep, workouts, or other health data to Apple Health.',
        background: false,
      },
    ],
    'react-native-health-connect',
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
