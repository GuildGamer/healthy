import { useCallback, useEffect, useRef, useState } from 'react';
import {
  endWalkLiveActivity,
  startWalkLiveActivity,
  updateWalkLiveActivity,
} from 'walk-live-activity';
import { trackEvent } from '@/lib/analytics';
import {
  NATIVE_MOVEMENT_UNAVAILABLE,
  loadLocationModule,
  type LocationModule,
} from '@/lib/device-health';
import { haversineMeters, pathDistanceMeters, type GeoPoint } from '@/lib/geo-session';
import {
  WALK_LOCATION_TASK,
  setWalkLocationListener,
  type WalkLocationFix,
} from '@/lib/walk-background-location';
import { setWalkControlHandler } from '@/lib/walk-control';
import { disarmWalkOfferMonitor } from '@/lib/walk-offer-monitor';
import {
  walkCardChanged,
  walkCardCopy,
  type WalkCardCopy,
} from '@/lib/walk-session-card';
import { useTheme } from '@/theme';
import { useWalkMotion } from './useWalkMotion';
import { useWalkTimer } from './useWalkTimer';
import { WALK_LOCATION_DENIED, type WalkPhase } from './walk-session-copy';

export type WalkAnalyticsContext = {
  context: 'challenge' | 'contest' | 'practice';
  matchId?: string;
};

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
  /**
   * The walker tapped Pause (in-app or lock-screen). Distinct from standing
   * still: movement alone will not restart the clock until they Resume.
   */
  userPaused: boolean;
  /** Location was unavailable or refused. Cleared by the next start. */
  error: string | null;
  /**
   * Asks for location, runs `beforeRecording`, then starts the GPS stream.
   * Resuming keeps the banked time and the route already drawn — a walk that
   * came up short has to be extendable, not restarted from zero.
   */
  start: (options: {
    resume: boolean;
    beforeRecording?: () => Promise<void>;
    analytics?: WalkAnalyticsContext;
  }) => Promise<void>;
  /** Holds the clock without ending the session or the lock-screen card. */
  pause: () => void;
  /** Clears a manual pause; the clock follows movement again. */
  resume: () => void;
  /** Banks the walk and moves to review. */
  stop: () => WalkRecording;
  /**
   * Puts a previously saved short walk back on the clock in review, so Leave →
   * Home → open again can Keep walking instead of starting from zero.
   */
  restore: (recording: WalkRecording) => void;
  /** Releases the GPS and motion streams without producing a recording. */
  abandon: () => void;
};

async function stopBackgroundUpdates(location: LocationModule): Promise<void> {
  if (!location.hasStartedLocationUpdatesAsync || !location.stopLocationUpdatesAsync) {
    return;
  }

  try {
    const running = await location.hasStartedLocationUpdatesAsync(WALK_LOCATION_TASK);
    if (running) {
      await location.stopLocationUpdatesAsync(WALK_LOCATION_TASK);
    }
  } catch {
    // Already stopped, or this binary has no background location.
  }
}

async function startBackgroundUpdates(
  location: LocationModule,
  card: WalkCardCopy,
): Promise<boolean> {
  if (!location.startLocationUpdatesAsync) {
    return false;
  }

  try {
    await location.startLocationUpdatesAsync(WALK_LOCATION_TASK, {
      accuracy: location.Accuracy.High,
      distanceInterval: ROUTE_FIX_INTERVAL_METERS,
      timeInterval: ROUTE_FIX_INTERVAL_MS,
      showsBackgroundLocationIndicator: true,
      pausesUpdatesAutomatically: false,
      activityType: location.ActivityType?.Fitness,
      foregroundService: {
        notificationTitle: card.title,
        notificationBody: card.body,
        notificationColor: '#3DDC97',
      },
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Owns the sensors a walk needs: location permission, the route stream, the
 * movement detector, and the clock that only runs while the walker does.
 * Shared so a contest walk and a challenge walk are measured identically —
 * two copies of this would drift into two different definitions of a minute.
 */
export function useWalkRecorder(): WalkRecorder {
  const { scheme } = useTheme();
  const locationRef = useRef<LocationModule | null>(null);
  const foregroundWatchRef = useRef<{ remove: () => void } | null>(null);
  /** Bumped by every stop, so an in-flight start knows it is stale. */
  const sessionIdRef = useRef(0);
  /** Last fix received, moving or not, so jitter is measured against itself. */
  const lastFixRef = useRef<GeoPoint | null>(null);
  const lastCardRef = useRef<WalkCardCopy | null>(null);
  const isMovingNowRef = useRef<() => boolean>(() => false);
  const reportDisplacementRef = useRef<(atMs: number) => void>(() => undefined);
  const usingBackgroundRef = useRef(false);
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
    restore: restoreTimer,
    reset: resetTimer,
  } = useWalkTimer();

  const [phase, setPhase] = useState<WalkPhase>('idle');
  const [points, setPoints] = useState<GeoPoint[]>([]);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userPaused, setUserPaused] = useState(false);
  const userPausedRef = useRef(false);

  isMovingNowRef.current = isMovingNow;
  reportDisplacementRef.current = reportDisplacement;
  userPausedRef.current = userPaused;

  const applyFixes = useCallback((fixes: readonly WalkLocationFix[]) => {
    for (const point of fixes) {
      const previousFix = lastFixRef.current;
      lastFixRef.current = point;

      if (previousFix && haversineMeters(previousFix, point) >= DISPLACEMENT_METERS) {
        reportDisplacementRef.current(point.recordedAt);
      }

      // Manual pause and standing still both leave distance alone.
      if (userPausedRef.current || !isMovingNowRef.current()) {
        continue;
      }

      setPoints((current) => [...current, point]);
    }
  }, []);

  const stopWatching = useCallback(() => {
    sessionIdRef.current += 1;
    setWalkLocationListener(null);
    foregroundWatchRef.current?.remove();
    foregroundWatchRef.current = null;
    usingBackgroundRef.current = false;
    const location = locationRef.current;
    if (location) {
      void stopBackgroundUpdates(location);
    }
  }, []);

  useEffect(() => stopWatching, [stopWatching]);

  // Manual pause wins; otherwise the clock follows the walker's feet.
  useEffect(() => {
    if (phase !== 'recording') {
      return;
    }

    if (userPaused) {
      pauseTimer();
      return;
    }

    if (isMoving) {
      resumeTimer();
      return;
    }

    pauseTimer({ effectiveAtMs: lastMovementAt() });
  }, [isMoving, lastMovementAt, pauseTimer, phase, resumeTimer, userPaused]);

  const isClockPaused = userPaused || !isMoving;

  // Keep the lock-screen card in sync with the live clock and pause state.
  useEffect(() => {
    if (phase !== 'recording') {
      return;
    }

    const copy = walkCardCopy({
      elapsedSeconds,
      distanceMeters: pathDistanceMeters(points),
      paused: isClockPaused,
      scheme,
    });

    if (!walkCardChanged(lastCardRef.current, copy)) {
      return;
    }

    const previous = lastCardRef.current;
    lastCardRef.current = copy;
    updateWalkLiveActivity(copy);

    const location = locationRef.current;
    if (!location || !usingBackgroundRef.current) {
      return;
    }

    // Restarting the Android foreground service every second would gap GPS.
    // Only refresh when pause state flips or a full minute ticks on the clock.
    const pausedChanged =
      (previous?.body.startsWith('Paused') ?? false) !== copy.body.startsWith('Paused');
    const minuteChanged =
      previous !== null && previous.title.slice(0, 2) !== copy.title.slice(0, 2);
    if (!pausedChanged && !minuteChanged) {
      return;
    }

    void (async () => {
      if (!location.hasStartedLocationUpdatesAsync) {
        return;
      }

      const running = await location.hasStartedLocationUpdatesAsync(WALK_LOCATION_TASK);
      if (!running) {
        return;
      }

      await stopBackgroundUpdates(location);
      await startBackgroundUpdates(location, copy);
    })();
  }, [elapsedSeconds, isClockPaused, phase, points, scheme]);

  const analyticsRef = useRef<WalkAnalyticsContext>({ context: 'challenge' });

  const start = useCallback(
    async ({
      resume,
      beforeRecording,
      analytics,
    }: {
      resume: boolean;
      beforeRecording?: () => Promise<void>;
      analytics?: WalkAnalyticsContext;
    }) => {
      setError(null);
      if (analytics) {
        analyticsRef.current = analytics;
      }

      const location = await loadLocationModule();
      if (!location) {
        setError(NATIVE_MOVEMENT_UNAVAILABLE);
        trackEvent('client_error', {
          surface: 'walk_start',
          code: 'native_unavailable',
        });
        return;
      }

      locationRef.current = location;

      const foreground = await location.requestForegroundPermissionsAsync();
      trackEvent('permission_result', {
        permission: 'location',
        granted: foreground.status === location.PermissionStatus.GRANTED,
      });
      if (foreground.status !== location.PermissionStatus.GRANTED) {
        setError(WALK_LOCATION_DENIED);
        return;
      }

      // Active counting owns location; stop the offer watcher first.
      await disarmWalkOfferMonitor();

      // Background is what keeps the walk measuring after the phone locks.
      // When the walker refuses it, fall back to a foreground watch so a walk
      // with the app open still works.
      const background = location.requestBackgroundPermissionsAsync
        ? await location.requestBackgroundPermissionsAsync()
        : { status: 'denied' };
      const canBackground = background.status === location.PermissionStatus.GRANTED;

      await beforeRecording?.();

      if (!resume) {
        setStartedAt(new Date().toISOString());
        setPoints([]);
        lastFixRef.current = null;
        resetTimer();
      }

      setUserPaused(false);
      setPhase('recording');
      if (!resume) {
        trackEvent('activity_session_started', {
          metric: 'walk',
          context: analyticsRef.current.context,
          ...(analyticsRef.current.matchId
            ? { matchId: analyticsRef.current.matchId }
            : {}),
        });
      }
      await startMotion();

      stopWatching();
      const sessionId = sessionIdRef.current;
      setWalkLocationListener(applyFixes);

      const initialCard = walkCardCopy({
        elapsedSeconds: resume ? elapsedSeconds : 0,
        distanceMeters: resume ? pathDistanceMeters(points) : 0,
        paused: false,
        scheme,
      });
      lastCardRef.current = initialCard;
      startWalkLiveActivity(initialCard);

      if (canBackground) {
        const started = await startBackgroundUpdates(location, initialCard);
        if (sessionId !== sessionIdRef.current) {
          await stopBackgroundUpdates(location);
          endWalkLiveActivity();
          return;
        }

        if (started) {
          usingBackgroundRef.current = true;
          resumeTimer();
          return;
        }
      }

      const watch = await location.watchPositionAsync(
        {
          accuracy: location.Accuracy.High,
          distanceInterval: ROUTE_FIX_INTERVAL_METERS,
          timeInterval: ROUTE_FIX_INTERVAL_MS,
        },
        (fix) => {
          applyFixes([
            {
              latitude: fix.coords.latitude,
              longitude: fix.coords.longitude,
              recordedAt: fix.timestamp,
            },
          ]);
        },
      );

      if (sessionId !== sessionIdRef.current) {
        watch.remove();
        endWalkLiveActivity();
        return;
      }

      foregroundWatchRef.current = watch;
      resumeTimer();
    },
    [
      applyFixes,
      elapsedSeconds,
      points,
      resetTimer,
      resumeTimer,
      scheme,
      startMotion,
      stopWatching,
    ],
  );

  const pause = useCallback(() => {
    if (phase !== 'recording' || userPausedRef.current) {
      return;
    }

    setUserPaused(true);
    pauseTimer();
  }, [pauseTimer, phase]);

  const resume = useCallback(() => {
    if (phase !== 'recording' || !userPausedRef.current) {
      return;
    }

    setUserPaused(false);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'recording') {
      setWalkControlHandler(null);
      return;
    }

    setWalkControlHandler({ pause, resume });
    return () => setWalkControlHandler(null);
  }, [pause, phase, resume]);

  const stop = useCallback((): WalkRecording => {
    const copy = walkCardCopy({
      elapsedSeconds,
      distanceMeters: pathDistanceMeters(points),
      paused: false,
      scheme,
    });
    stopWatching();
    stopMotion();
    endWalkLiveActivity(copy);
    lastCardRef.current = null;
    setUserPaused(false);

    const durationSeconds = pauseTimer();
    const endedAt = new Date().toISOString();
    setPhase('review');
    trackEvent('activity_session_ended', {
      metric: 'walk',
      context: analyticsRef.current.context,
      outcome: 'saved',
      count: durationSeconds,
      durationSeconds,
      ...(analyticsRef.current.matchId
        ? { matchId: analyticsRef.current.matchId }
        : {}),
    });

    return {
      durationSeconds,
      distanceMeters: Math.round(pathDistanceMeters(points)),
      startedAt: startedAt ?? endedAt,
      endedAt,
    };
  }, [elapsedSeconds, pauseTimer, points, scheme, startedAt, stopMotion, stopWatching]);

  const restore = useCallback(
    (recording: WalkRecording) => {
      stopWatching();
      stopMotion();
      endWalkLiveActivity();
      lastCardRef.current = null;
      lastFixRef.current = null;
      setUserPaused(false);
      setError(null);
      setPoints([]);
      setStartedAt(recording.startedAt);
      restoreTimer(recording.durationSeconds);
      setPhase('review');
    },
    [restoreTimer, stopMotion, stopWatching],
  );

  const abandon = useCallback(() => {
    trackEvent('activity_session_ended', {
      metric: 'walk',
      context: analyticsRef.current.context,
      outcome: 'abandoned',
      count: elapsedSeconds,
      durationSeconds: elapsedSeconds,
      ...(analyticsRef.current.matchId
        ? { matchId: analyticsRef.current.matchId }
        : {}),
    });
    stopWatching();
    stopMotion();
    pauseTimer();
    endWalkLiveActivity();
    lastCardRef.current = null;
    setUserPaused(false);
  }, [elapsedSeconds, pauseTimer, stopMotion, stopWatching]);

  return {
    phase,
    points,
    elapsedSeconds,
    autoPaused: phase === 'recording' && !userPaused && !isMoving,
    userPaused: phase === 'recording' && userPaused,
    error,
    start,
    pause,
    resume,
    stop,
    restore,
    abandon,
  };
}
