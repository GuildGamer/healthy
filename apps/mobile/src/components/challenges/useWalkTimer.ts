import { useCallback, useEffect, useRef, useState } from 'react';

const TICK_MS = 1_000;

export type WalkTimer = {
  elapsedSeconds: number;
  /** Begins a new segment. Already-banked time is kept. */
  resume: () => void;
  /**
   * Banks the current segment and returns the final elapsed seconds.
   * `effectiveAtMs` ends the segment in the past — an auto-pause passes the
   * last step, so the gap before we noticed the stop earns nothing.
   */
  pause: (options?: { effectiveAtMs?: number }) => number;
  reset: () => void;
};

/**
 * Walking time measured from wall-clock stamps rather than counted ticks.
 * A ten minute walk is mostly spent with the phone locked in a pocket, and
 * `setInterval` stalls there — counting ticks loses most of the walk.
 */
export function useWalkTimer(): WalkTimer {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const bankedSecondsRef = useRef(0);
  const segmentStartedAtRef = useRef<number | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  useEffect(() => clearTick, [clearTick]);

  const resume = useCallback(() => {
    if (segmentStartedAtRef.current !== null) {
      return;
    }

    segmentStartedAtRef.current = Date.now();
    tickRef.current = setInterval(() => {
      const segmentStartedAt = segmentStartedAtRef.current;
      if (segmentStartedAt === null) {
        return;
      }

      setElapsedSeconds(
        bankedSecondsRef.current + secondsBetween(segmentStartedAt, Date.now()),
      );
    }, TICK_MS);
  }, []);

  const pause = useCallback(
    (options?: { effectiveAtMs?: number }): number => {
      clearTick();

      const segmentStartedAt = segmentStartedAtRef.current;
      if (segmentStartedAt !== null) {
        const endedAt = Math.min(
          options?.effectiveAtMs ?? Date.now(),
          Date.now(),
        );
        bankedSecondsRef.current += secondsBetween(segmentStartedAt, endedAt);
        segmentStartedAtRef.current = null;
      }

      setElapsedSeconds(bankedSecondsRef.current);
      return bankedSecondsRef.current;
    },
    [clearTick],
  );

  const reset = useCallback(() => {
    clearTick();
    bankedSecondsRef.current = 0;
    segmentStartedAtRef.current = null;
    setElapsedSeconds(0);
  }, [clearTick]);

  return { elapsedSeconds, resume, pause, reset };
}

function secondsBetween(fromMs: number, toMs: number): number {
  return Math.max(0, Math.floor((toMs - fromMs) / 1_000));
}
