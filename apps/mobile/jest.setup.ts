import '@testing-library/react-native/matchers';

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({
    granted: true,
    canAskAgain: true,
  })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  setNotificationChannelAsync: jest.fn(async () => undefined),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => undefined),
  scheduleNotificationAsync: jest.fn(async () => 'notification-id'),
  getExpoPushTokenAsync: jest.fn(async () => ({
    data: 'ExponentPushToken[test]',
  })),
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

jest.mock('expo-image-picker', () => ({
  CameraType: { front: 'front', back: 'back' },
  requestCameraPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestMediaLibraryPermissionsAsync: jest.fn(async () => ({
    granted: true,
  })),
  launchCameraAsync: jest.fn(async () => ({ canceled: true, assets: null })),
  launchImageLibraryAsync: jest.fn(async () => ({
    canceled: true,
    assets: null,
  })),
}));

jest.mock('expo-location', () => ({
  Accuracy: { Balanced: 3, High: 4 },
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied' },
  requestForegroundPermissionsAsync: jest.fn(async () => ({
    status: 'granted',
  })),
  watchPositionAsync: jest.fn(async () => ({ remove: jest.fn() })),
}));

jest.mock('expo-sensors', () => ({
  Pedometer: {
    isAvailableAsync: jest.fn(async () => false),
    getPermissionsAsync: jest.fn(async () => ({ granted: false })),
    requestPermissionsAsync: jest.fn(async () => ({ granted: false })),
    getStepCountAsync: jest.fn(async () => ({ steps: 0 })),
    watchStepCount: jest.fn(() => ({ remove: jest.fn() })),
  },
  Accelerometer: {
    isAvailableAsync: jest.fn(async () => false),
    setUpdateInterval: jest.fn(),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  function MockMapView(props: Record<string, unknown>) {
    return React.createElement(View, props);
  }
  function MockPolyline() {
    return null;
  }
  function MockMarker() {
    return null;
  }
  MockMapView.Polyline = MockPolyline;
  MockMapView.Marker = MockMarker;
  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMarker,
    Polyline: MockPolyline,
  };
});

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => true),
  shareAsync: jest.fn(async () => undefined),
}));

jest.mock('react-native-view-shot', () => ({
  captureRef: jest.fn(async () => 'file://share-card.jpg'),
}));

jest.mock('quickpose-camera', () => {
  const React = require('react');
  const { View } = require('react-native');
  function MockQuickPoseCameraView(props: Record<string, unknown>) {
    return React.createElement(View, props);
  }
  return {
    QuickPoseCameraView: MockQuickPoseCameraView,
  };
});

jest.mock('expo-iap', () => ({
  useIAP: () => ({
    connected: true,
    requestPurchase: jest.fn(async () => undefined),
    finishTransaction: jest.fn(async () => undefined),
    getAvailablePurchases: jest.fn(async () => undefined),
    restorePurchases: jest.fn(async () => undefined),
  }),
  fetchProducts: jest.fn(async () => [
    { id: 'com.healthyapp.app.premium.month' },
  ]),
  finishTransaction: jest.fn(async () => undefined),
  getAvailablePurchases: jest.fn(async () => []),
  requestPurchase: jest.fn(async () => undefined),
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(async () => undefined),
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

jest.mock('expo-store-review', () => ({
  hasAction: jest.fn(async () => true),
  isAvailableAsync: jest.fn(async () => true),
  requestReview: jest.fn(async () => undefined),
  storeUrl: jest.fn(() => null),
}));
