import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Healthy',
  slug: 'healthy',
  scheme: 'healthy',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  icon: './assets/icon.png',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.healthy.app',
    infoPlist: {
      NSCameraUsageDescription:
        'Healthy uses the camera to prove gym sessions and count push-ups on this phone.',
      NSLocationWhenInUseUsageDescription:
        'Healthy uses your location to record walking and running routes.',
      NSMotionUsageDescription:
        'Healthy uses motion data to count steps from this phone.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/icon.png',
      backgroundColor: '#3DDC97',
    },
    package: 'com.healthy.app',
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
        cameraPermission:
          'Healthy uses the camera for gym proof and your profile photo.',
        photosPermission:
          'Healthy uses your photos so you can set a profile picture.',
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Healthy uses your location to record walking and running routes.',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: 'be6f70ce-9076-4d48-8d07-b841eb0dce17',
    },
  },
});
