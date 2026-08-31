import { useCallback, useEffect, useRef, useState } from 'react';
import type { PoseFrame } from '@/lib/pose/landmarks';
import {
  PushupCounter,
  type PushupCounterSnapshot,
} from '@/lib/pose/pushup-counter';
import {
  syntheticPushupDepth,
  syntheticPushupFrame,
} from '@/lib/pose/synthetic-pushup';

const EMPTY_SNAPSHOT: PushupCounterSnapshot = {
  count: 0,
  phase: 'up',
  downness: 0,
  bodyInFrame: false,
  visibilityRatio: 0,
};

export type PoseDriveMode = 'live' | 'guided';

/**
 * Owns the PushupCounter and accepts either live MoveNet frames or a guided
 * synthetic landmark stream (simulator / native model unavailable).
 */
export function usePoseSessionCounter() {
  const counterRef = useRef(new PushupCounter());
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionOriginMs = useRef(0);
  const [snapshot, setSnapshot] = useState<PushupCounterSnapshot>(EMPTY_SNAPSHOT);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [driveMode, setDriveMode] = useState<PoseDriveMode>('live');
  const lastEmitMs = useRef(0);

  const clearTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  useEffect(() => clearTick, [clearTick]);

  const reset = useCallback(() => {
    clearTick();
    counterRef.current.reset();
    setSnapshot(EMPTY_SNAPSHOT);
    setElapsedSeconds(0);
    sessionOriginMs.current = Date.now();
    lastEmitMs.current = 0;
  }, [clearTick]);

  const ingestFrame = useCallback((frame: PoseFrame) => {
    const next = counterRef.current.ingest(frame);
    const now = Date.now();
    if (now - lastEmitMs.current < 66) {
      return;
    }

    lastEmitMs.current = now;
    setSnapshot(next);
  }, []);

  const start = useCallback(
    (mode: PoseDriveMode) => {
      reset();
      setDriveMode(mode);

      tickRef.current = setInterval(() => {
        setElapsedSeconds((current) => current + 1);

        if (mode !== 'guided') {
          return;
        }

        const timestampMs = Date.now() - sessionOriginMs.current;
        const depth = syntheticPushupDepth(timestampMs);
        ingestFrame(syntheticPushupFrame(timestampMs, depth));
      }, 1_000 / 15);
    },
    [ingestFrame, reset],
  );

  const stop = useCallback(() => {
    clearTick();
  }, [clearTick]);

  return {
    snapshot,
    elapsedSeconds,
    driveMode,
    start,
    stop,
    reset,
    ingestFrame,
  };
}
