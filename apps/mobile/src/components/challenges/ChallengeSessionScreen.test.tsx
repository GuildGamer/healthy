import type { TodayChallenge } from '@product/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';
import { apiClient } from '@/lib/api';
import {
  loadAccelerometerModule,
  loadLocationModule,
  loadPedometerModule,
  type AccelerometerSample,
} from '@/lib/device-health';
import { ChallengeSessionScreen } from './ChallengeSessionScreen';

const testSafeAreaMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const START_MS = Date.parse('2026-09-22T09:00:00.000Z');

jest.mock('@/lib/api', () => ({
  API_BASE_URL: 'http://localhost:3000',
  apiClient: {
    listTodayChallenges: jest.fn(),
    me: jest.fn(),
    startChallenge: jest.fn(),
    completeChallenge: jest.fn(),
  },
  apiQuery: {},
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: jest.fn(),
    canGoBack: () => true,
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

// Jest cannot run the `import(...)` calls inside the real loaders, so the
// native modules are handed to the screen through the same seams instead.
jest.mock('@/lib/device-health', () => ({
  ...jest.requireActual('@/lib/device-health'),
  loadLocationModule: jest.fn(),
  loadAccelerometerModule: jest.fn(),
  loadPedometerModule: jest.fn(),
}));

const mockedApi = apiClient as unknown as {
  listTodayChallenges: jest.Mock;
  me: jest.Mock;
  startChallenge: jest.Mock;
  completeChallenge: jest.Mock;
};

const mockedLoadLocationModule = loadLocationModule as jest.Mock;
const mockedLoadAccelerometerModule = loadAccelerometerModule as jest.Mock;
const mockedLoadPedometerModule = loadPedometerModule as jest.Mock;
const requestForegroundPermissionsAsync = jest.fn();
const watchPositionAsync = jest.fn();
const removeWatch = jest.fn();
const addMotionListener = jest.fn();
const watchStepCount = jest.fn();

const locationModule = {
  PermissionStatus: { GRANTED: 'granted' },
  Accuracy: { Balanced: 3, High: 4 },
  requestForegroundPermissionsAsync,
  watchPositionAsync,
};

function accelerometerModule() {
  return {
    isAvailableAsync: jest.fn(async () => true),
    setUpdateInterval: jest.fn(),
    addListener: addMotionListener,
  };
}

function pedometerModule() {
  return {
    isAvailableAsync: jest.fn(async () => true),
    getPermissionsAsync: jest.fn(async () => ({ granted: true })),
    requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
    getStepCountAsync: jest.fn(async () => ({ steps: 0 })),
    watchStepCount,
  };
}

/** The ten minute walk from the seeded catalog. */
function walkChallenge(overrides: Partial<TodayChallenge> = {}): TodayChallenge {
  return {
    id: 'uc-walk',
    challengeId: 'c-walk',
    title: 'Ten minute walk',
    description: 'Walk for at least ten minutes.',
    category: 'general',
    rewardPoints: 20,
    sortOrder: 2,
    status: 'pending',
    frequency: 'daily',
    completionKind: 'check_in',
    instruction: 'Walk for at least ten minutes.',
    icon: 'walk',
    periodKey: '2026-09-22',
    evidenceRequest: null,
    draft: null,
    progress: { filled: 0, required: 1 },
    capture: {
      kind: 'device_session',
      metric: 'walk',
      target: { durationMinutes: 10, distanceMeters: null, count: null },
    },
    ...overrides,
  };
}

function renderSession() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

  const view = render(
    <SafeAreaProvider initialMetrics={testSafeAreaMetrics}>
      <QueryClientProvider client={client}>
        <ChallengeSessionScreen challengeId="c-walk" />
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

let emitSample: (sample: AccelerometerSample) => void;
let emitSteps: (steps: number) => void;
let stepTotal = 0;

/** Lying still in gravity: magnitude 1, so no deviation at all. */
const RESTING: AccelerometerSample = { x: 0, y: 0, z: 1 };
/** A stride swings the phone well past the agitation threshold. */
const WALKING: AccelerometerSample = { x: 0, y: 0, z: 1.4 };

/**
 * One burst of strides per step of the simulation. Kept under the stop grace
 * so a walk stays live, and long enough that ten minutes is not ten minutes of
 * test. The real sensor reports far more often; the hook only cares that
 * agitated readings keep arriving.
 */
const STRIDE_SECONDS = 2;
const SAMPLES_PER_STRIDE = 3;

/**
 * Walks for `seconds`, moving the phone and landing steps so the walk never
 * auto-pauses. Both signals are needed: agitation alone reads as a shaken
 * phone once the step counter has gone quiet for long enough.
 */
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

/** The phone is waved about for `seconds` without a step being taken. */
async function shakeFor(seconds: number) {
  let remaining = seconds;

  while (remaining > 0) {
    const stride = Math.min(STRIDE_SECONDS, remaining);
    await act(async () => {
      jest.advanceTimersByTime(stride * 1_000);
      for (let sample = 0; sample < SAMPLES_PER_STRIDE; sample += 1) {
        emitSample(WALKING);
      }
    });
    remaining -= stride;
  }
}

/** Time passes with the phone at rest, which is what standing still is. */
async function standStillFor(seconds: number) {
  await act(async () => {
    jest.advanceTimersByTime(seconds * 1_000);
    emitSample(RESTING);
  });
}

type LocationFix = {
  coords: { latitude: number; longitude: number };
  timestamp: number;
};

/** Feeds the screen a GPS fix through the callback it handed to the watcher. */
function emitFix(coords: { latitude: number; longitude: number }) {
  const startedWatch = watchPositionAsync.mock.calls.at(-1);
  const onFix = startedWatch?.[1] as ((fix: LocationFix) => void) | undefined;
  if (!onFix) {
    throw new Error('No walk is being watched');
  }

  act(() => {
    onFix({ coords, timestamp: Date.now() });
  });
}

async function startWalk() {
  fireEvent.press(await screen.findByTestId('start-session'));
  await waitFor(() => {
    expect(screen.getByTestId('stop-session')).toBeOnTheScreen();
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

  mockedApi.listTodayChallenges.mockResolvedValue({
    dayKey: '2026-09-22',
    challenges: [walkChallenge()],
    completedCount: 0,
    totalCount: 1,
  });
  mockedApi.me.mockResolvedValue({ healthLinkStatus: 'connected' });
  mockedApi.startChallenge.mockResolvedValue({ id: 'uc-walk' });
  mockedApi.completeChallenge.mockResolvedValue({
    pointsAwarded: 20,
    currentStreakDays: 3,
  });
  mockedLoadLocationModule.mockResolvedValue(locationModule);
  requestForegroundPermissionsAsync.mockResolvedValue({ status: 'granted' });
  watchPositionAsync.mockResolvedValue({ remove: removeWatch });

  // Readings are fed in per test; a walk stays live until the phone goes quiet.
  mockedLoadAccelerometerModule.mockResolvedValue(accelerometerModule());
  addMotionListener.mockImplementation(
    (callback: (sample: AccelerometerSample) => void) => {
      emitSample = callback;
      return { remove: jest.fn() };
    },
  );

  mockedLoadPedometerModule.mockResolvedValue(pedometerModule());
  watchStepCount.mockImplementation(
    (callback: (result: { steps: number }) => void) => {
      emitSteps = (steps) => callback({ steps });
      return { remove: jest.fn() };
    },
  );
});

afterEach(() => {
  jest.useRealTimers();
});

describe('ChallengeSessionScreen walk goal', () => {
  it('shows the goal over the map before the walk starts', async () => {
    const { cleanup } = renderSession();

    expect(await screen.findByTestId('session-stats')).toHaveTextContent(
      '00:00 / 10:00',
    );
    expect(screen.getByText('Ready')).toBeOnTheScreen();
    expect(screen.getByTestId('session-map')).toBeOnTheScreen();

    await cleanup();
  });

  it('counts the walk against the goal while recording', async () => {
    const { cleanup } = renderSession();

    await startWalk();
    await walkFor(134);

    expect(screen.getByTestId('session-stats')).toHaveTextContent(
      '02:14 / 10:00',
    );
    expect(screen.getByTestId('session-review')).toHaveTextContent(
      '07:46 more to finish',
    );
    expect(screen.getByText('Recording')).toBeOnTheScreen();

    await cleanup();
  });

  it('shows the distance covered next to a timed goal', async () => {
    const { cleanup } = renderSession();

    await startWalk();
    emitFix({ latitude: 51.5074, longitude: -0.1278 });
    emitFix({ latitude: 51.5074, longitude: -0.1252 });
    await walkFor(134);

    // ~180 m east along the same latitude.
    expect(screen.getByTestId('session-secondary-stat')).toHaveTextContent(
      '0.18 km',
    );

    await cleanup();
  });

  it('stops the clock when the walker stands still', async () => {
    const { cleanup } = renderSession();

    await startWalk();
    await walkFor(60);
    await standStillFor(120);

    expect(screen.getByText('Paused')).toBeOnTheScreen();
    expect(screen.getByTestId('session-stats')).toHaveTextContent(
      '01:00 / 10:00',
    );

    await cleanup();
  });

  it('stops the clock for a phone shaken without a step being taken', async () => {
    const { cleanup } = renderSession();

    await startWalk();
    await shakeFor(120);

    // Two minutes of shaking earns only the opening grace that covers the step
    // counter warming up. Nothing after it counts.
    expect(screen.getByText('Paused')).toBeOnTheScreen();
    expect(screen.getByTestId('session-stats')).toHaveTextContent(
      '00:22 / 10:00',
    );

    await cleanup();
  });

  it('picks the clock back up as soon as the phone moves again', async () => {
    const { cleanup } = renderSession();

    await startWalk();
    await walkFor(60);
    await standStillFor(120);
    await walkFor(60);

    // Resuming after a long rest waits on both signals: the phone moving, then
    // the step counter confirming it is a person walking. That costs the two
    // simulated strides carrying them, and a second or two on a real phone.
    expect(screen.queryByText('Paused')).toBeNull();
    expect(screen.getByTestId('session-stats')).toHaveTextContent(
      '01:56 / 10:00',
    );

    await cleanup();
  });

  it('leaves stationary drift out of the route', async () => {
    const { cleanup } = renderSession();

    await startWalk();
    emitFix({ latitude: 51.5074, longitude: -0.1278 });
    await standStillFor(120);
    // A couple of metres of jitter, which is what a parked phone produces.
    emitFix({ latitude: 51.5074, longitude: -0.127765 });

    expect(screen.getByTestId('session-secondary-stat')).toHaveTextContent(
      '0.00 km',
    );

    await cleanup();
  });

  // A phone riding steady in a bag or a pram barely shakes, and docking that
  // walk would be plainly wrong. The route is the proof the sensors miss.
  it('keeps crediting a walk the accelerometer cannot feel', async () => {
    const { cleanup } = renderSession();

    await startWalk();
    emitFix({ latitude: 51.5074, longitude: -0.1278 });
    await standStillFor(20);
    expect(screen.getByText('Paused')).toBeOnTheScreen();

    // Roughly 180 metres on, which no amount of jitter explains.
    emitFix({ latitude: 51.5074, longitude: -0.1252 });
    await standStillFor(4);

    expect(screen.queryByText('Paused')).toBeNull();
    expect(screen.getByTestId('session-stats')).toHaveTextContent(
      '00:04 / 10:00',
    );

    await cleanup();
  });

  it('names what is missing when a short walk is stopped', async () => {
    const { cleanup } = renderSession();

    await startWalk();
    await walkFor(134);
    fireEvent.press(screen.getByTestId('stop-session'));

    expect(await screen.findByTestId('session-review')).toHaveTextContent(
      '07:46 more to finish',
    );
    expect(screen.getByText('Short of the goal')).toBeOnTheScreen();
    expect(screen.getByTestId('resume-session')).toBeOnTheScreen();
    expect(screen.queryByTestId('use-session')).toBeNull();

    await cleanup();
  });

  it('adds to the banked time when a short walk is resumed', async () => {
    const { cleanup } = renderSession();

    await startWalk();
    await walkFor(300);
    fireEvent.press(screen.getByTestId('stop-session'));

    fireEvent.press(await screen.findByTestId('resume-session'));
    await waitFor(() => {
      expect(screen.getByTestId('stop-session')).toBeOnTheScreen();
    });
    await walkFor(300);

    expect(screen.getByTestId('session-stats')).toHaveTextContent(
      '10:00 / 10:00',
    );

    fireEvent.press(screen.getByTestId('stop-session'));

    expect(await screen.findByTestId('use-session')).toBeOnTheScreen();
    expect(screen.queryByTestId('resume-session')).toBeNull();

    await cleanup();
  });

  it('submits the whole walk once the goal is met', async () => {
    const { cleanup } = renderSession();

    await startWalk();
    await walkFor(600);
    fireEvent.press(screen.getByTestId('stop-session'));

    fireEvent.press(await screen.findByTestId('use-session'));

    await waitFor(() => {
      expect(mockedApi.completeChallenge).toHaveBeenCalledWith({
        userChallengeId: 'uc-walk',
        deviceActivity: expect.objectContaining({
          source: 'in_app_gps',
          metric: 'walk',
          durationSeconds: 600,
        }),
      });
    });

    await cleanup();
  });

  it('keeps the walk confirmable by hand when location is refused', async () => {
    requestForegroundPermissionsAsync.mockResolvedValue({ status: 'denied' });

    const { cleanup } = renderSession();

    fireEvent.press(await screen.findByTestId('start-session'));

    await waitFor(() => {
      expect(screen.getByText(/Location is needed/)).toBeOnTheScreen();
    });
    expect(watchPositionAsync).not.toHaveBeenCalled();
    expect(screen.getByTestId('confirm-challenge')).toBeOnTheScreen();

    await cleanup();
  });
});
