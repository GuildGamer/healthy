import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';
import { apiClient } from '@/lib/api';
import {
  loadAccelerometerModule,
  loadLocationModule,
  loadPedometerModule,
  type AccelerometerSample,
} from '@/lib/device-health';
import { MATCH_WALK_TOO_SHORT } from './match-copy';
import { MatchWalkScreen } from './MatchWalkScreen';

const testSafeAreaMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const START_MS = Date.parse('2026-09-22T09:00:00.000Z');

jest.mock('@/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  apiClient: { submitMatchAttempt: jest.fn() },
  apiQuery: {},
}));

const mockBack = jest.fn();
const mockDismiss = jest.fn();
const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    back: () => mockBack(),
    canDismiss: () => true,
    dismiss: () => mockDismiss(),
    replace: (href: string) => mockReplace(href),
  },
}));

// Jest cannot run the `import(...)` calls inside the real loaders, so the
// native modules are handed to the screen through the same seams instead.
jest.mock('@/lib/device-health', () => ({
  ...jest.requireActual('@/lib/device-health'),
  loadLocationModule: jest.fn(),
  loadAccelerometerModule: jest.fn(),
  loadPedometerModule: jest.fn(),
}));

const mockedApi = apiClient as unknown as { submitMatchAttempt: jest.Mock };
const mockedLoadLocationModule = loadLocationModule as jest.Mock;
const mockedLoadAccelerometerModule = loadAccelerometerModule as jest.Mock;
const mockedLoadPedometerModule = loadPedometerModule as jest.Mock;
const requestForegroundPermissionsAsync = jest.fn();
const requestBackgroundPermissionsAsync = jest.fn();
const hasStartedLocationUpdatesAsync = jest.fn();
const startLocationUpdatesAsync = jest.fn();
const stopLocationUpdatesAsync = jest.fn();
const watchPositionAsync = jest.fn();
const addMotionListener = jest.fn();
const watchStepCount = jest.fn();

const locationModule = {
  PermissionStatus: { GRANTED: 'granted' },
  Accuracy: { Balanced: 3, High: 4 },
  ActivityType: { Fitness: 2 },
  requestForegroundPermissionsAsync,
  requestBackgroundPermissionsAsync,
  hasStartedLocationUpdatesAsync,
  startLocationUpdatesAsync,
  stopLocationUpdatesAsync,
  watchPositionAsync,
};

/** A stride swings the phone well past the agitation threshold. */
const WALKING: AccelerometerSample = { x: 0, y: 0, z: 1.4 };
const STRIDE_SECONDS = 2;
const SAMPLES_PER_STRIDE = 3;

let emitSample: (sample: AccelerometerSample) => void;
let emitSteps: (steps: number) => void;
let stepTotal = 0;

/** Walks for `seconds` without the clock auto-pausing. */
async function walkFor(seconds: number) {
  let remaining = seconds;

  while (remaining > 0) {
    const stride = Math.min(STRIDE_SECONDS, remaining);
    await act(async () => {
      jest.advanceTimersByTime(stride * 1_000);
      for (let sample = 0; sample < SAMPLES_PER_STRIDE; sample += 1) {
        emitSample(WALKING);
      }
      stepTotal += 3;
      emitSteps(stepTotal);
    });
    remaining -= stride;
  }
}

function renderScreen() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  const view = render(
    <SafeAreaProvider initialMetrics={testSafeAreaMetrics}>
      <QueryClientProvider client={client}>
        <MatchWalkScreen matchId="m1" />
      </QueryClientProvider>
    </SafeAreaProvider>,
  );

  return {
    cleanup: async () => {
      await waitFor(() => {
        expect(client.isFetching()).toBe(0);
      });
      view.unmount();
      client.clear();
    },
  };
}

async function startWalk() {
  fireEvent.press(await screen.findByTestId('match-walk-start'));
  await waitFor(() => {
    expect(screen.getByTestId('match-walk-stop')).toBeOnTheScreen();
  });
  await waitFor(() => {
    expect(addMotionListener).toHaveBeenCalled();
    expect(watchStepCount).toHaveBeenCalled();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(START_MS);
  stepTotal = 0;

  mockedApi.submitMatchAttempt.mockResolvedValue({ ok: true });
  mockedLoadLocationModule.mockResolvedValue(locationModule);
  requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
  requestBackgroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
  hasStartedLocationUpdatesAsync.mockResolvedValue(false);
  startLocationUpdatesAsync.mockResolvedValue(undefined);
  stopLocationUpdatesAsync.mockResolvedValue(undefined);
  watchPositionAsync.mockResolvedValue({ remove: jest.fn() });

  mockedLoadAccelerometerModule.mockResolvedValue({
    isAvailableAsync: jest.fn(async () => true),
    setUpdateInterval: jest.fn(),
    addListener: addMotionListener,
  });
  addMotionListener.mockImplementation((callback: (sample: AccelerometerSample) => void) => {
    emitSample = callback;
    return { remove: jest.fn() };
  });

  mockedLoadPedometerModule.mockResolvedValue({
    isAvailableAsync: jest.fn(async () => true),
    getPermissionsAsync: jest.fn(async () => ({ granted: true })),
    requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
    getStepCountAsync: jest.fn(async () => ({ steps: 0 })),
    watchStepCount,
  });
  watchStepCount.mockImplementation((callback: (result: { steps: number }) => void) => {
    emitSteps = (steps) => callback({ steps });
    return { remove: jest.fn() };
  });
});

afterEach(() => {
  jest.useRealTimers();
});

describe('MatchWalkScreen', () => {
  // Stopping is the walker saying they are done. Asking them to confirm work
  // the phone already measured is how a finished walk gets thrown away.
  it('banks whole minutes against the contest when the walk stops', async () => {
    const { cleanup } = renderScreen();

    await startWalk();
    await walkFor(310);

    expect(screen.getByTestId('match-walk-elapsed')).toHaveTextContent('05:10');

    fireEvent.press(screen.getByTestId('match-walk-stop'));

    await waitFor(() => {
      expect(mockedApi.submitMatchAttempt).toHaveBeenCalledWith({
        matchId: 'm1',
        count: 5,
        durationSeconds: 310,
        source: 'in_app_walk',
      });
    });
    expect(mockDismiss).toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();

    await cleanup();
  });

  // Walking away from the screen is not a decision to bin the walk.
  it('banks the walk when the walker leaves mid-walk', async () => {
    const { cleanup } = renderScreen();

    await startWalk();
    await walkFor(200);
    fireEvent.press(screen.getByTestId('match-walk-back'));

    await waitFor(() => {
      expect(mockedApi.submitMatchAttempt).toHaveBeenCalledWith({
        matchId: 'm1',
        count: 3,
        durationSeconds: 200,
        source: 'in_app_walk',
      });
    });

    await cleanup();
  });

  // The floor is only fair if it is visible while there is still time to walk
  // past it, rather than sprung on the walker after they stop.
  it('names the minimum until the walk has passed it', async () => {
    const { cleanup } = renderScreen();

    await startWalk();
    await walkFor(30);

    expect(screen.getByText(/Nothing counts until 01:00/)).toBeOnTheScreen();

    await walkFor(40);

    expect(screen.queryByText(/Nothing counts until 01:00/)).toBeNull();
    expect(screen.getByText('Stop now and these minutes go on the board.')).toBeOnTheScreen();

    await cleanup();
  });

  // Anything under a minute rounds to nothing, so the score would silently be
  // zero. The walk stays resumable instead of being sent and lost.
  it('refuses a walk that would round down to no score', async () => {
    const { cleanup } = renderScreen();

    await startWalk();
    await walkFor(40);
    fireEvent.press(screen.getByTestId('match-walk-stop'));

    expect(screen.getByText(MATCH_WALK_TOO_SHORT)).toBeOnTheScreen();
    expect(screen.queryByTestId('match-walk-log')).toBeNull();
    expect(screen.getByTestId('match-walk-resume')).toBeOnTheScreen();
    expect(mockedApi.submitMatchAttempt).not.toHaveBeenCalled();

    await cleanup();
  });

  // A contest score nobody can audit is worth nothing, so there is no way to
  // claim a walk that the phone did not measure.
  it('offers no way to log a walk by hand', async () => {
    const { cleanup } = renderScreen();

    expect(await screen.findByTestId('match-walk-start')).toBeOnTheScreen();
    expect(screen.queryByTestId('match-walk-log')).toBeNull();

    await cleanup();
  });
});
