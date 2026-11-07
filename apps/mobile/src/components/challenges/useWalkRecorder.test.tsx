import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Platform } from 'react-native';
import {
  loadAccelerometerModule,
  loadLocationModule,
  loadPedometerModule,
} from '@/lib/device-health';
import { isWalkLocationTaskReady } from '@/lib/walk-background-location';
import { ThemeProvider } from '@/theme';
import { useWalkRecorder } from './useWalkRecorder';

jest.mock('@/lib/device-health', () => ({
  ...jest.requireActual('@/lib/device-health'),
  loadLocationModule: jest.fn(),
  loadAccelerometerModule: jest.fn(),
  loadPedometerModule: jest.fn(),
}));

jest.mock('@/lib/walk-background-location', () => ({
  ...jest.requireActual('@/lib/walk-background-location'),
  isWalkLocationTaskReady: jest.fn(() => true),
}));

jest.mock('@/lib/walk-offer-monitor', () => ({
  disarmWalkOfferMonitor: jest.fn(async () => undefined),
}));

jest.mock('@/lib/analytics', () => ({
  trackEvent: jest.fn(),
}));

const mockedLoadLocation = loadLocationModule as jest.Mock;
const mockedLoadAccelerometer = loadAccelerometerModule as jest.Mock;
const mockedLoadPedometer = loadPedometerModule as jest.Mock;
const mockedIsWalkLocationTaskReady = isWalkLocationTaskReady as jest.Mock;

const stopLocationUpdatesAsync = jest.fn(async () => undefined);
const startLocationUpdatesAsync = jest.fn(async () => undefined);
const hasStartedLocationUpdatesAsync = jest.fn(async () => false);
const watchRemove = jest.fn();
const watchPositionAsync = jest.fn(async () => ({ remove: watchRemove }));

function setPlatformOs(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    get: () => os,
  });
}

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

describe('useWalkRecorder pause location', () => {
  const originalOs = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    setPlatformOs('ios');
    mockedIsWalkLocationTaskReady.mockReturnValue(true);
    hasStartedLocationUpdatesAsync.mockResolvedValue(false);
    mockedLoadLocation.mockResolvedValue({
      PermissionStatus: { GRANTED: 'granted' },
      Accuracy: { Balanced: 3, High: 4 },
      ActivityType: { Fitness: 2 },
      requestForegroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
      requestBackgroundPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
      hasStartedLocationUpdatesAsync,
      startLocationUpdatesAsync,
      stopLocationUpdatesAsync,
      watchPositionAsync,
    });
    mockedLoadAccelerometer.mockResolvedValue({
      isAvailableAsync: jest.fn(async () => false),
      setUpdateInterval: jest.fn(),
      addListener: jest.fn(() => ({ remove: jest.fn() })),
    });
    mockedLoadPedometer.mockResolvedValue({
      isAvailableAsync: jest.fn(async () => false),
      getPermissionsAsync: jest.fn(async () => ({ granted: false })),
      requestPermissionsAsync: jest.fn(async () => ({ granted: false })),
      getStepCountAsync: jest.fn(async () => ({ steps: 0 })),
      watchStepCount: jest.fn(() => ({ remove: jest.fn() })),
    });
  });

  afterEach(() => {
    setPlatformOs(originalOs);
  });

  it('stops background GPS on user pause and starts it again on resume', async () => {
    const { result } = renderHook(() => useWalkRecorder(), { wrapper });

    await act(async () => {
      await result.current.start({ resume: false, analytics: { context: 'contest' } });
    });

    await waitFor(() => expect(result.current.phase).toBe('recording'));
    expect(startLocationUpdatesAsync).toHaveBeenCalled();

    hasStartedLocationUpdatesAsync.mockResolvedValue(true);

    act(() => {
      result.current.pause();
    });

    expect(result.current.userPaused).toBe(true);
    await waitFor(() => expect(stopLocationUpdatesAsync).toHaveBeenCalled());

    startLocationUpdatesAsync.mockClear();
    hasStartedLocationUpdatesAsync.mockResolvedValue(false);

    act(() => {
      result.current.resume();
    });

    expect(result.current.userPaused).toBe(false);
    await waitFor(() => expect(startLocationUpdatesAsync).toHaveBeenCalled());
  });

  it('ends the Live Activity when the recorder unmounts', async () => {
    const { endWalkLiveActivity } = jest.requireMock('walk-live-activity') as {
      endWalkLiveActivity: jest.Mock;
    };
    const { result, unmount } = renderHook(() => useWalkRecorder(), { wrapper });

    await act(async () => {
      await result.current.start({ resume: false, analytics: { context: 'contest' } });
    });
    await waitFor(() => expect(result.current.phase).toBe('recording'));

    endWalkLiveActivity.mockClear();
    unmount();

    expect(endWalkLiveActivity).toHaveBeenCalled();
  });
});
