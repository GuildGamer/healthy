import { act, renderHook, waitFor } from '@testing-library/react-native';
import {
  loadAccelerometerModule,
  loadPedometerModule,
  type AccelerometerSample,
} from '@/lib/device-health';
import {
  useWalkMotion,
  WALK_DISPLACEMENT_TRUST_SECONDS,
  WALK_SAMPLE_INTERVAL_MS,
  WALK_STEP_TRUST_SECONDS,
  WALK_STOP_GRACE_SECONDS,
} from './useWalkMotion';

// Jest cannot run the `import('expo-sensors')` inside the real loaders, so both
// sensors are handed to the hook through the same seam instead.
jest.mock('@/lib/device-health', () => ({
  ...jest.requireActual('@/lib/device-health'),
  loadAccelerometerModule: jest.fn(),
  loadPedometerModule: jest.fn(),
}));

const mockedLoadAccelerometerModule = loadAccelerometerModule as jest.Mock;
const mockedLoadPedometerModule = loadPedometerModule as jest.Mock;

/** Lying still in gravity: magnitude 1, so no deviation at all. */
const RESTING: AccelerometerSample = { x: 0, y: 0, z: 1 };
/** A stride swings the phone well past the agitation threshold. */
const WALKING: AccelerometerSample = { x: 0, y: 0, z: 1.4 };

let emitSample: (sample: AccelerometerSample) => void;
const removeSubscription = jest.fn();
const setUpdateInterval = jest.fn();
const addListener = jest.fn((callback: (sample: AccelerometerSample) => void) => {
  emitSample = (sample) => act(() => callback(sample));
  return { remove: removeSubscription };
});

function accelerometer(overrides: Record<string, unknown> = {}) {
  return {
    isAvailableAsync: jest.fn(async () => true),
    setUpdateInterval,
    addListener,
    ...overrides,
  };
}

let emitSteps: (steps: number) => void;
const removeStepSubscription = jest.fn();
const watchStepCount = jest.fn((callback: (r: { steps: number }) => void) => {
  emitSteps = (steps) => act(() => callback({ steps }));
  return { remove: removeStepSubscription };
});

function pedometer(overrides: Record<string, unknown> = {}) {
  return {
    isAvailableAsync: jest.fn(async () => true),
    getPermissionsAsync: jest.fn(async () => ({ granted: true })),
    requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
    getStepCountAsync: jest.fn(async () => ({ steps: 0 })),
    watchStepCount,
    ...overrides,
  };
}

/** Sensor streams attached but never torn down. Must always settle at zero. */
function leakedSubscriptions(): number {
  const attached = addListener.mock.calls.length + watchStepCount.mock.calls.length;
  const removed = removeSubscription.mock.calls.length + removeStepSubscription.mock.calls.length;
  return attached - removed;
}

let stepTotal = 0;

/** Runs both sensors at their real cadence, with or without steps landing. */
function feed(seconds: number, sample: AccelerometerSample, stepping: boolean) {
  const ticks = Math.round((seconds * 1_000) / WALK_SAMPLE_INTERVAL_MS);

  for (let tick = 0; tick < ticks; tick += 1) {
    act(() => {
      jest.advanceTimersByTime(WALK_SAMPLE_INTERVAL_MS);
    });
    emitSample(sample);

    // The step counter reports about once a second while walking.
    if (stepping && tick % 10 === 9) {
      stepTotal += 2;
      emitSteps(stepTotal);
    }
  }
}

const walkFor = (seconds: number) => feed(seconds, WALKING, true);
const standStillFor = (seconds: number) => feed(seconds, RESTING, false);
/** The phone is being waved about, but nobody is taking a step. */
const shakeFor = (seconds: number) => feed(seconds, WALKING, false);

async function startWatching() {
  const { result } = renderHook(() => useWalkMotion());

  await act(async () => {
    await result.current.start();
  });

  return result;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(Date.parse('2026-09-22T09:00:00.000Z'));
  stepTotal = 0;
  mockedLoadAccelerometerModule.mockResolvedValue(accelerometer());
  mockedLoadPedometerModule.mockResolvedValue(pedometer());
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useWalkMotion', () => {
  it('treats a fresh start as movement so the first strides count', async () => {
    const result = await startWatching();

    expect(result.current.isMoving).toBe(true);
    expect(result.current.isMovingNow()).toBe(true);
    expect(setUpdateInterval).toHaveBeenCalledWith(WALK_SAMPLE_INTERVAL_MS);
  });

  it('rides out the still moment between two strides', async () => {
    const result = await startWatching();

    walkFor(1);
    standStillFor(WALK_STOP_GRACE_SECONDS - 1);

    expect(result.current.isMoving).toBe(true);
  });

  it('reports a stop within a few seconds of the walker going still', async () => {
    const result = await startWatching();

    walkFor(1);
    standStillFor(WALK_STOP_GRACE_SECONDS + 0.5);

    expect(result.current.isMoving).toBe(false);
    expect(result.current.isMovingNow()).toBe(false);
  });

  it('picks the walk back up within a stride of moving again', async () => {
    const result = await startWatching();

    standStillFor(WALK_STOP_GRACE_SECONDS + 1);
    expect(result.current.isMoving).toBe(false);

    walkFor(0.5);

    expect(result.current.isMoving).toBe(true);
    expect(result.current.isMovingNow()).toBe(true);
  });

  it('does not let a single knock restart a paused walk', async () => {
    const result = await startWatching();

    standStillFor(WALK_STOP_GRACE_SECONDS + 1);
    emitSample(WALKING);

    expect(result.current.isMoving).toBe(false);
  });

  it('stops crediting a phone that is shaken without a step being taken', async () => {
    const result = await startWatching();

    shakeFor(WALK_STEP_TRUST_SECONDS + 2);

    expect(result.current.isMoving).toBe(false);
    expect(result.current.isMovingNow()).toBe(false);
  });

  it('keeps crediting a real walk for as long as steps keep landing', async () => {
    const result = await startWatching();

    walkFor(WALK_STEP_TRUST_SECONDS + 10);

    expect(result.current.isMoving).toBe(true);
    expect(result.current.isMovingNow()).toBe(true);
  });

  it('trusts the accelerometer when the phone cannot count steps', async () => {
    mockedLoadPedometerModule.mockResolvedValue(
      pedometer({ isAvailableAsync: jest.fn(async () => false) }),
    );

    const result = await startWatching();
    shakeFor(WALK_STEP_TRUST_SECONDS + 2);

    expect(result.current.isMoving).toBe(true);
  });

  // A phone riding steady in a bag barely shakes, but it is still going
  // somewhere, and the route proves it.
  it('credits covered ground even when the phone is not being shaken', async () => {
    const result = await startWatching();

    standStillFor(WALK_STOP_GRACE_SECONDS + 1);
    expect(result.current.isMoving).toBe(false);

    act(() => result.current.reportDisplacement(Date.now()));

    expect(result.current.isMoving).toBe(true);
    expect(result.current.isMovingNow()).toBe(true);
  });

  it('stops crediting ground that stopped being covered', async () => {
    const result = await startWatching();

    act(() => result.current.reportDisplacement(Date.now()));
    standStillFor(WALK_DISPLACEMENT_TRUST_SECONDS + 1);

    expect(result.current.isMoving).toBe(false);
  });

  it('backdates a pause to the last fix when the route was the only signal', async () => {
    const result = await startWatching();

    walkFor(1);
    act(() => result.current.reportDisplacement(Date.now()));
    const movedAt = Date.now();
    standStillFor(30);

    expect(result.current.lastMovementAt()).toBe(movedAt);
  });

  it('backdates movement to the last stride, not to the pause', async () => {
    const result = await startWatching();

    walkFor(1);
    const stoppedAt = Date.now();
    standStillFor(30);

    expect(result.current.lastMovementAt()).toBe(stoppedAt);
  });

  it('never pauses a walk when the phone has no usable sensor', async () => {
    mockedLoadAccelerometerModule.mockResolvedValue(
      accelerometer({ isAvailableAsync: jest.fn(async () => false) }),
    );

    const result = await startWatching();
    act(() => {
      jest.advanceTimersByTime(WALK_STOP_GRACE_SECONDS * 10_000);
    });

    expect(result.current.isMoving).toBe(true);
    expect(result.current.isMovingNow()).toBe(true);
  });

  it('never pauses a walk when the sensor module is missing', async () => {
    mockedLoadAccelerometerModule.mockResolvedValue(null);

    const result = await startWatching();
    act(() => {
      jest.advanceTimersByTime(WALK_STOP_GRACE_SECONDS * 10_000);
    });

    expect(result.current.isMoving).toBe(true);
  });

  it('leaves no sensor running when the walk ends mid-start', async () => {
    let finishLoading: (() => void) | undefined;
    mockedLoadAccelerometerModule.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishLoading = () => resolve(accelerometer());
        }),
    );

    const { result } = renderHook(() => useWalkMotion());

    // The walker backs out while the sensor is still being loaded.
    const starting = act(async () => {
      await result.current.start();
    });
    act(() => result.current.stop());
    finishLoading?.();
    await starting;

    expect(leakedSubscriptions()).toBe(0);
  });

  it('drops the sensor subscription when the walk ends', async () => {
    const result = await startWatching();

    act(() => result.current.stop());

    await waitFor(() => {
      expect(removeSubscription).toHaveBeenCalled();
    });
    expect(leakedSubscriptions()).toBe(0);
  });
});
