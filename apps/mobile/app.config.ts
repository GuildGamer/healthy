import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Product',
  slug: 'product',
  scheme: 'product',
  version: '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.product.app',
  },
  android: {
    adaptiveIcon: {
      backgroundColor: '#0B1220',
    },
    package: 'com.product.app',
  },
  plugins: ['expo-router', 'expo-dev-client', 'expo-secure-store'],
  experiments: {
    typedRoutes: true,
  },
});
