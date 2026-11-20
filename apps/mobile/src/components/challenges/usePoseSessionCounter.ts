import type { MatchMetric } from '@product/contract/match-board';
import { MATCH_METRIC_MEASURE } from '@product/contract/match-board';
import type { NativePoseCountUpdate } from 'quickpose-camera';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PushupCounterSnapshot } from '@/lib/pose/pushup-counter';

const EMPTY_SNAPSHOT: PushupCounterSnapshot = {
  count: 0,
  phase: 'up',
  downness: 0,
  bodyInFrame: false,
  visibilityRatio: 0,
  calibrating: false,
  calibrationProgress: 0,
  movementRange: 0,
  movementTooSmall: false,
  tooClose: false,
  rejectReason: 'none',
  debugFrame: null,
  coachPrompt: null,
};

export type PoseSessionStartOptions = {
  /** Keep counter state when promoting from setup watch → counting. */
  preserveCounter?: boolean;
};

export type PoseSessionCounterOptions = {
  metric?: MatchMetric;
};

/**
 * Thin store for native-owned pose counts. Native ThresholdCounter / HoldTimer
 * / stance run on every QuickPose frame; JS only mirrors coalesced updates for
 * HUD, auto-start, submit, and elapsed wall time.
 */
export function usePoseSessionCounter(options: PoseSessionCounterOptions = {}) {
  const metric = options.metric ?? 'pushups';
  const isHold = MATCH_METRIC_MEASURE[metric] === 'seconds';
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionOriginMs = useRef(0);
  const [snapshot, setSnapshot] = useState<PushupCounterSnapshot>(EMPTY_SNAPSHOT);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [resetCountToken, setResetCountToken] = useState(0);
  const metricRef = useRef(metric);
  metricRef.current = metric;

  const clearTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  useEffect(() => clearTick, [clearTick]);

  const reset = useCallback(() => {
    clearTick();
    setSnapshot(EMPTY_SNAPSHOT);
    setElapsedSeconds(0);
    sessionOriginMs.current = Date.now();
    setResetCountToken((token) => token + 1);
  }, [clearTick]);

  const applyNativeUpdate = useCallback((update: NativePoseCountUpdate) => {
    const downness = update.measure ?? 0;
    setSnapshot({
      ...EMPTY_SNAPSHOT,
      count: update.count,
      phase: update.phase,
      downness,
      bodyInFrame: update.bodyInFrame,
      visibilityRatio: update.bodyInFrame ? 1 : 0,
      calibrationProgress: 1,
      movementRange: downness,
      tooClose: update.tooClose,
      rejectReason: update.bodyInFrame ? 'none' : 'framing',
      coachPrompt: update.coachPrompt,
    });
  }, []);

  const start = useCallback(
    (startOptions?: PoseSessionStartOptions) => {
      const preserveCounter = startOptions?.preserveCounter === true;

      if (!preserveCounter) {
        reset();
      } else {
        sessionOriginMs.current = Date.now();
      }

      clearTick();
      tickRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - sessionOriginMs.current) / 1000));
      }, 250);
    },
    [clearTick, reset],
  );

  const stop = useCallback(() => {
    clearTick();
  }, [clearTick]);

  return {
    snapshot,
    elapsedSeconds,
    start,
    stop,
    reset,
    applyNativeUpdate,
    /** @deprecated Prefer applyNativeUpdate — native owns the count. */
    ingestQuickPose: applyNativeUpdate,
    resetCountToken,
    isHold,
  };
}
