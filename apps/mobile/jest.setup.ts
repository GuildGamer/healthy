import '@testing-library/react-native/matchers';

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({
    granted: true,
    canAskAgain: true,
    status: 'granted',
  })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  setNotificationChannelAsync: jest.fn(async () => undefined),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => undefined),
  scheduleNotificationAsync: jest.fn(async () => 'notification-id'),
  getExpoPushTokenAsync: jest.fn(async () => ({
    data: 'ExponentPushToken[test]',
  })),
  getLastNotificationResponseAsync: jest.fn(async () => null),
  addNotificationResponseReceivedListener: jest.fn(() => ({
    remove: jest.fn(),
  })),
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

jest.mock('expo-image-manipulator', () => ({
  SaveFormat: { JPEG: 'jpeg', PNG: 'png', WEBP: 'webp' },
  ImageManipulator: {
    manipulate: jest.fn(),
  },
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
  ActivityType: { Fitness: 2 },
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied' },
  requestForegroundPermissionsAsync: jest.fn(async () => ({
    status: 'granted',
  })),
  requestBackgroundPermissionsAsync: jest.fn(async () => ({
    status: 'granted',
  })),
  hasStartedLocationUpdatesAsync: jest.fn(async () => false),
  startLocationUpdatesAsync: jest.fn(async () => undefined),
  stopLocationUpdatesAsync: jest.fn(async () => undefined),
  watchPositionAsync: jest.fn(async () => ({ remove: jest.fn() })),
}));

jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskDefined: jest.fn(() => false),
}));

jest.mock('walk-live-activity', () => ({
  startWalkLiveActivity: jest.fn(),
  updateWalkLiveActivity: jest.fn(),
  endWalkLiveActivity: jest.fn(),
}));

jest.mock('expo-live-activity', () => ({
  startActivity: jest.fn(() => 'activity-1'),
  updateActivity: jest.fn(),
  stopActivity: jest.fn(),
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

jest.mock('@kingstinct/react-native-healthkit', () => ({
  isHealthDataAvailableAsync: jest.fn(async () => false),
  requestAuthorization: jest.fn(async () => true),
  queryCategorySamples: jest.fn(async () => []),
}));

jest.mock('react-native-health-connect', () => ({
  initialize: jest.fn(async () => false),
  requestPermission: jest.fn(async () => []),
  readRecords: jest.fn(async () => ({ records: [] })),
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

jest.mock('expo-system-ui', () => ({
  setBackgroundColorAsync: jest.fn(async () => undefined),
  getBackgroundColorAsync: jest.fn(async () => null),
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-clipboard', () => ({
  getStringAsync: jest.fn(async () => ''),
  setStringAsync: jest.fn(async () => undefined),
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
    proofClipsDirectoryUri: jest.fn(() => null),
    canRecordProofClips: jest.fn(() => true),
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
  fetchProducts: jest.fn(async () => [{ id: 'com.healthyapp.app.premium.month' }]),
  finishTransaction: jest.fn(async () => undefined),
  getAvailablePurchases: jest.fn(async () => []),
  requestPurchase: jest.fn(async () => undefined),
}));

jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn(async () => undefined),
  impactAsync: jest.fn(async () => undefined),
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
}));

jest.mock('expo-keep-awake', () => ({
  useKeepAwake: jest.fn(),
}));

jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  saveToLibraryAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-video', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    useVideoPlayer: jest.fn(() => ({ loop: false, playing: false })),
    VideoView: function MockVideoView(props: Record<string, unknown>) {
      return React.createElement(View, props);
    },
  };
});

jest.mock('expo-store-review', () => ({
  hasAction: jest.fn(async () => true),
  isAvailableAsync: jest.fn(async () => true),
  requestReview: jest.fn(async () => undefined),
  storeUrl: jest.fn(() => null),
}));

// No phone in Jest: report no 12/24-hour setting unless a test sets one.
jest.mock('expo-localization', () => ({
  getCalendars: jest.fn(() => [
    { calendar: null, timeZone: 'UTC', uses24hourClock: null, firstWeekday: 2 },
  ]),
}));

// Times follow the phone's 12/24-hour clock; pin a 24-hour locale so every machine agrees.
jest.mock('@/lib/clock-time', () => {
  const actual = jest.requireActual<typeof import('@/lib/clock-time')>('@/lib/clock-time');
  return {
    ...actual,
    formatClockTime: (value: Date | number) => actual.formatClockTime(value, 'en-GB'),
    usesTwentyFourHourClock: () => actual.usesTwentyFourHourClock('en-GB'),
  };
});
