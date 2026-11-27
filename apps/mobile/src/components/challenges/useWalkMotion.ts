import { useCallback, useEffect, useRef, useState } from 'react';
import {
  loadAccelerometerModule,
  loadPedometerModule,
  type AccelerometerSample,
  type PedometerModule,
} from '@/lib/device-health';

/**
 * How long the phone may sit quiet before the walk counts as stopped. This only
 * has to outlast the still moment between two strides, because the
 * accelerometer reports continuously rather than in batches.
 */
export const WALK_STOP_GRACE_SECONDS = 2.5;

/**
 * How stale the last counted step may be before shaking stops passing for
 * walking. Long enough to cover the step counter's own reporting lag and a
 * wait at a kerb, short enough that nobody rattles a phone into a finished
 * challenge.
 */
export const WALK_STEP_TRUST_SECONDS = 20;

/**
 * How long a GPS displacement keeps the clock running on its own. Fixes land
 * every couple of seconds while walking, so this only has to outlast a lost
 * signal at a junction, not a rest.
 */
export const WALK_DISPLACEMENT_TRUST_SECONDS = 10;

/** 10 Hz. A walking gait runs near 2 Hz, so every stride gets sampled often. */
export const WALK_SAMPLE_INTERVAL_MS = 100;

/**
 * Deviation from gravity that counts as the phone being carried, in g. A phone
 * left on a table stays under 0.01 and a hand holding one still stays under
 * 0.05, while walking swings well past this on every stride.
 */
const AGITATION_THRESHOLD_G = 0.12;

/**
 * Knocking a pocketed phone should not restart a paused walk, so resuming
 * needs several agitated samples close together rather than one spike.
 */
const ONSET_SAMPLES = 3;
const ONSET_WINDOW_MS = 1_000;

const STOP_GRACE_MS = WALK_STOP_GRACE_SECONDS * 1_000;
const STEP_TRUST_MS = WALK_STEP_TRUST_SECONDS * 1_000;
const DISPLACEMENT_TRUST_MS = WALK_DISPLACEMENT_TRUST_SECONDS * 1_000;

export type WalkMotion = {
  /** Drives the HUD. False once the walker has clearly stopped. */
  isMoving: boolean;
  /** Same answer for callbacks that cannot read render state. */
  isMovingNow: () => boolean;
  /** When movement was last seen, so a pause can be backdated to it. */
  lastMovementAt: () => number;
  /**
   * Ground covered, reported by whoever owns the location stream. Counts as
   * movement on its own — see the note on the hook.
   */
  reportDisplacement: (atMs: number) => void;
  start: () => Promise<void>;
  stop: () => void;
};

/**
 * Decides whether a walk is earning credit right now, from three signals that
 * cover for each other. The accelerometer gives the fast edges, because it
 * reports continuously and notices a stop within a stride. The step counter
 * decides whether that motion is a person walking at all, because it is the
 * only one of the two that a shaken phone cannot fake. Covering ground stands
 * alone: a phone riding steady in a bag or a pram shakes very little, and
 * docking that walk would be plainly wrong.
 *
 * A phone missing a sensor reports movement rather than none: losing the
 * check is better than docking someone for a walk they really did.
 */
export function useWalkMotion(): WalkMotion {
  const [isMoving, setIsMoving] = useState(true);
  const canDetectStopsRef = useRef(false);
  const canCountStepsRef = useRef(false);
  const lastMovementAtRef = useRef(Date.now());
  const lastDisplacementAtRef = useRef(0);
  const lastStepAtRef = useRef(Date.now());
  const lastStepTotalRef = useRef(0);
  const agitatedAtRef = useRef<number[]>([]);
  const subscriptionsRef = useRef<{ remove: () => void }[]>([]);
  /**
   * Bumped by every start and stop. Starting is async, so a walk that ends
   * mid-load would otherwise attach a sensor listener nobody owns and nobody
   * removes, leaving it firing for the rest of the app's life.
   */
  const runIdRef = useRef(0);

  const isMovingNow = useCallback((): boolean => {
    if (!canDetectStopsRef.current) {
      return true;
    }

    const now = Date.now();
    // Ground covered needs no corroboration: no amount of shaking a phone
    // moves it down the street.
    if (now - lastDisplacementAtRef.current <= DISPLACEMENT_TRUST_MS) {
      return true;
    }

    if (now - lastMovementAtRef.current > STOP_GRACE_MS) {
      return false;
    }

    if (!canCountStepsRef.current) {
      return true;
    }

    return now - lastStepAtRef.current <= STEP_TRUST_MS;
  }, []);

  const lastMovementAt = useCallback(
    () => Math.max(lastMovementAtRef.current, lastDisplacementAtRef.current),
    [],
  );

  const reportDisplacement = useCallback(
    (atMs: number) => {
      lastDisplacementAtRef.current = Math.min(atMs, Date.now());
      setIsMoving(isMovingNow());
    },
    [isMovingNow],
  );

  const stop = useCallback(() => {
    runIdRef.current += 1;
    subscriptionsRef.current.forEach((subscription) => subscription.remove());
    subscriptionsRef.current = [];
  }, []);

  useEffect(() => stop, [stop]);

  /** Holds a subscription, or drops it if the walk ended while it loaded. */
  const keepSubscription = useCallback(
    (runId: number, subscription: { remove: () => void }): void => {
      if (runId !== runIdRef.current) {
        subscription.remove();
        return;
      }

      subscriptionsRef.current.push(subscription);
    },
    [],
  );

  const watchAgitation = useCallback(
    async (runId: number): Promise<void> => {
      const accelerometer = await loadAccelerometerModule();
      const usable = accelerometer !== null && (await accelerometer.isAvailableAsync());

      if (runId !== runIdRef.current) {
        return;
      }

      canDetectStopsRef.current = usable;
      if (!accelerometer || !usable) {
        return;
      }

      accelerometer.setUpdateInterval(WALK_SAMPLE_INTERVAL_MS);
      keepSubscription(
        runId,
        accelerometer.addListener((sample) => {
          recordSample(sample, agitatedAtRef, lastMovementAtRef);
          setIsMoving(isMovingNow());
        }),
      );
    },
    [isMovingNow, keepSubscription],
  );

  const watchSteps = useCallback(
    async (runId: number): Promise<void> => {
      const pedometer = await loadPedometerModule();
      const usable = pedometer !== null && (await canCountSteps(pedometer));

      if (runId !== runIdRef.current) {
        return;
      }

      canCountStepsRef.current = usable;
      if (!pedometer || !usable) {
        return;
      }

      keepSubscription(
        runId,
        pedometer.watchStepCount(({ steps }) => {
          if (steps <= lastStepTotalRef.current) {
            return;
          }

          lastStepTotalRef.current = steps;
          lastStepAtRef.current = Date.now();
        }),
      );
    },
    [keepSubscription],
  );

  const start = useCallback(async () => {
    stop();
    const runId = runIdRef.current;
    const startedAt = Date.now();
    lastMovementAtRef.current = startedAt;
    // The first strides are credited before the step counter has reported, so
    // a walk is never docked for the sensor's own warm-up.
    lastStepAtRef.current = startedAt;
    lastDisplacementAtRef.current = 0;
    lastStepTotalRef.current = 0;
    agitatedAtRef.current = [];
    setIsMoving(true);

    await Promise.all([watchAgitation(runId), watchSteps(runId)]);
  }, [stop, watchAgitation, watchSteps]);

  return {
    isMoving,
    isMovingNow,
    lastMovementAt,
    reportDisplacement,
    start,
    stop,
  };
}

/** Keeps `lastMovementAt` current while the phone is being carried. */
function recordSample(
  sample: AccelerometerSample,
  agitatedAtRef: { current: number[] },
  lastMovementAtRef: { current: number },
): void {
  if (gravityDeviation(sample) < AGITATION_THRESHOLD_G) {
    return;
  }

  const now = Date.now();
  const recent = agitatedAtRef.current.filter((at) => now - at < ONSET_WINDOW_MS);
  recent.push(now);
  agitatedAtRef.current = recent;

  if (recent.length < ONSET_SAMPLES) {
    return;
  }

  lastMovementAtRef.current = now;
}

/** How far the phone is from simply sitting in gravity, in g. */
function gravityDeviation({ x, y, z }: AccelerometerSample): number {
  return Math.abs(Math.sqrt(x * x + y * y + z * z) - 1);
}

async function canCountSteps(pedometer: PedometerModule): Promise<boolean> {
  const available = await pedometer.isAvailableAsync();
  if (!available) {
    return false;
  }

  const permission = await pedometer.requestPermissionsAsync();
  return permission.granted;
}
