import { useCallback, useEffect, useRef, useState } from 'react';
import { NATIVE_MOVEMENT_UNAVAILABLE, loadLocationModule } from '@/lib/device-health';
import { haversineMeters, pathDistanceMeters, type GeoPoint } from '@/lib/geo-session';
import { useWalkMotion } from './useWalkMotion';
import { useWalkTimer } from './useWalkTimer';
import { WALK_LOCATION_DENIED, type WalkPhase } from './walk-session-copy';

/**
 * A metre lands roughly every other stride, so the readout moves while the
 * walker is still deciding whether the app is working. Five metres meant seven
 * steps of nothing.
 */
const ROUTE_FIX_INTERVAL_METERS = 1;
const ROUTE_FIX_INTERVAL_MS = 2_000;

/**
 * How far consecutive fixes must separate before the walker counts as having
 * covered ground. Comfortably past the jitter a phone sitting on a table
 * produces, and inside two strides of a real walk.
 */
const DISPLACEMENT_METERS = 10;

/** A finished walk, in the units both a challenge and a contest need. */
export type WalkRecording = {
  durationSeconds: number;
  /** Whole metres, which is what the activity log stores. */
  distanceMeters: number;
  startedAt: string;
  endedAt: string;
};

export type WalkRecorder = {
  phase: WalkPhase;
  points: GeoPoint[];
  elapsedSeconds: number;
  /** Recording, but the walker has stopped moving and the clock is held. */
  autoPaused: boolean;
  /** Location was unavailable or refused. Cleared by the next start. */
  error: string | null;
  /**
   * Asks for location, runs `beforeRecording`, then starts the GPS stream.
   * Resuming keeps the banked time and the route already drawn — a walk that
   * came up short has to be extendable, not restarted from zero.
   */
  start: (options: { resume: boolean; beforeRecording?: () => Promise<void> }) => Promise<void>;
  /** Banks the walk and moves to review. */
  stop: () => WalkRecording;
  /** Releases the GPS and motion streams without producing a recording. */
  abandon: () => void;
};

/**
 * Owns the sensors a walk needs: location permission, the route stream, the
 * movement detector, and the clock that only runs while the walker does.
 * Shared so a contest walk and a challenge walk are measured identically —
 * two copies of this would drift into two different definitions of a minute.
 */
export function useWalkRecorder(): WalkRecorder {
  const watchRef = useRef<{ remove: () => void } | null>(null);
  /** Bumped by every stop, so an in-flight watch request knows it is stale. */
  const watchIdRef = useRef(0);
  /** Last fix received, moving or not, so jitter is measured against itself. */
  const lastFixRef = useRef<GeoPoint | null>(null);
  const {
    isMoving,
    isMovingNow,
    lastMovementAt,
    reportDisplacement,
    start: startMotion,
    stop: stopMotion,
  } = useWalkMotion();
  const {
    elapsedSeconds,
    pause: pauseTimer,
    resume: resumeTimer,
    reset: resetTimer,
  } = useWalkTimer();

  const [phase, setPhase] = useState<WalkPhase>('idle');
  const [points, setPoints] = useState<GeoPoint[]>([]);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stopWatching = useCallback(() => {
    watchIdRef.current += 1;
    watchRef.current?.remove();
    watchRef.current = null;
  }, []);

  useEffect(() => stopWatching, [stopWatching]);

  // The clock follows the walker's feet: standing still earns no credit.
  useEffect(() => {
    if (phase !== 'recording') {
      return;
    }

    if (isMoving) {
      resumeTimer();
      return;
    }

    pauseTimer({ effectiveAtMs: lastMovementAt() });
  }, [isMoving, lastMovementAt, pauseTimer, phase, resumeTimer]);

  const start = useCallback(
    async ({
      resume,
      beforeRecording,
    }: {
      resume: boolean;
      beforeRecording?: () => Promise<void>;
    }) => {
      setError(null);

      const location = await loadLocationModule();
      if (!location) {
        setError(NATIVE_MOVEMENT_UNAVAILABLE);
        return;
      }

      const permission = await location.requestForegroundPermissionsAsync();
      if (permission.status !== location.PermissionStatus.GRANTED) {
        setError(WALK_LOCATION_DENIED);
        return;
      }

      await beforeRecording?.();

      if (!resume) {
        setStartedAt(new Date().toISOString());
        setPoints([]);
        lastFixRef.current = null;
        resetTimer();
      }

      setPhase('recording');
      await startMotion();

      stopWatching();
      const watchId = watchIdRef.current;
      const watch = await location.watchPositionAsync(
        {
          accuracy: location.Accuracy.High,
          distanceInterval: ROUTE_FIX_INTERVAL_METERS,
          timeInterval: ROUTE_FIX_INTERVAL_MS,
        },
        (fix) => {
          const point: GeoPoint = {
            latitude: fix.coords.latitude,
            longitude: fix.coords.longitude,
            recordedAt: fix.timestamp,
          };
          const previousFix = lastFixRef.current;
          lastFixRef.current = point;

          if (previousFix && haversineMeters(previousFix, point) >= DISPLACEMENT_METERS) {
            reportDisplacement(fix.timestamp);
          }

          // Drift while the walker stands still would inflate the route.
          if (!isMovingNow()) {
            return;
          }

          setPoints((current) => [...current, point]);
        },
      );

      // Leaving mid-request would otherwise strand a high-accuracy GPS stream
      // that outlives the screen.
      if (watchId !== watchIdRef.current) {
        watch.remove();
        return;
      }

      watchRef.current = watch;
      resumeTimer();
    },
    [isMovingNow, reportDisplacement, resetTimer, resumeTimer, startMotion, stopWatching],
  );

  const stop = useCallback((): WalkRecording => {
    stopWatching();
    stopMotion();

    const durationSeconds = pauseTimer();
    const endedAt = new Date().toISOString();
    setPhase('review');

    return {
      durationSeconds,
      distanceMeters: Math.round(pathDistanceMeters(points)),
      startedAt: startedAt ?? endedAt,
      endedAt,
    };
  }, [pauseTimer, points, startedAt, stopMotion, stopWatching]);

  const abandon = useCallback(() => {
    stopWatching();
    stopMotion();
    pauseTimer();
  }, [pauseTimer, stopMotion, stopWatching]);

  return {
    phase,
    points,
    elapsedSeconds,
    autoPaused: phase === 'recording' && !isMoving,
    error,
    start,
    stop,
    abandon,
  };
}
