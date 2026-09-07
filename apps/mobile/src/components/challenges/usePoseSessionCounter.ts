import { useCallback, useEffect, useRef, useState } from 'react';
import type { PoseFrame } from '@/lib/pose/landmarks';
import {
  PushupCounter,
  type PushupCounterSnapshot,
} from '@/lib/pose/pushup-counter';
import {
  insideMeasureFromResults,
  pushupFormFeedback,
  pushupMeasureFromResults,
  quickPoseFraming,
  snapshotFromQuickPose,
  type QuickPosePushupUpdate,
} from '@/lib/pose/quickpose-pushup';
import { QuickPoseThresholdCounter } from '@/lib/pose/quickpose-threshold-counter';
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
  calibrating: false,
  calibrationProgress: 0,
  movementRange: 0,
  movementTooSmall: false,
  tooClose: false,
  rejectReason: 'none',
  debugFrame: null,
  coachPrompt: null,
};

export type PoseDriveMode = 'live' | 'guided';

export type PoseSessionStartOptions = {
  /** Keep counter state when promoting from setup watch → counting. */
  preserveCounter?: boolean;
};

/**
 * Live path: QuickPose `fitness.pushUps` + threshold hysteresis.
 * Guided path: synthetic landmarks (simulator / no SDK key).
 */
export function usePoseSessionCounter() {
  const liveCounterRef = useRef(new QuickPoseThresholdCounter());
  const guidedCounterRef = useRef(new PushupCounter());
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionOriginMs = useRef(0);
  const [snapshot, setSnapshot] = useState<PushupCounterSnapshot>(EMPTY_SNAPSHOT);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [driveMode, setDriveMode] = useState<PoseDriveMode>('live');
  const lastEmitMs = useRef(0);
  const lastPublishedCount = useRef(0);

  const clearTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  useEffect(() => clearTick, [clearTick]);

  const reset = useCallback(() => {
    clearTick();
    liveCounterRef.current.reset();
    guidedCounterRef.current.reset();
    setSnapshot(EMPTY_SNAPSHOT);
    setElapsedSeconds(0);
    sessionOriginMs.current = Date.now();
    lastEmitMs.current = 0;
    lastPublishedCount.current = 0;
  }, [clearTick]);

  const ingestFrame = useCallback((frame: PoseFrame) => {
    const next = guidedCounterRef.current.ingest(frame);
    const now = Date.now();
    if (now - lastEmitMs.current < 66) {
      return;
    }

    lastEmitMs.current = now;
    setSnapshot(next);
  }, []);

  const ingestQuickPose = useCallback((update: QuickPosePushupUpdate) => {
    const measure = pushupMeasureFromResults(update.results);
    const insideMeasure = insideMeasureFromResults(update.results);
    const formFeedback = pushupFormFeedback(update.feedbacks);
    const framingFeedback = update.feedbacks['inside.wholeBody'] ?? null;
    const framing = quickPoseFraming({ measure, insideMeasure });
    const finishingRep = liveCounterRef.current.state.isEntered;

    if (
      measure != null &&
      formFeedback == null &&
      (!framing.tooClose || finishingRep)
    ) {
      liveCounterRef.current.count(measure);
    }

    const next = snapshotFromQuickPose({
      measure,
      insideMeasure,
      formFeedback,
      framingFeedback,
      counter: liveCounterRef.current.state,
    });
    const now = Date.now();
    const countChanged = next.count !== lastPublishedCount.current;
    if (!countChanged && now - lastEmitMs.current < 66) {
      return;
    }

    lastEmitMs.current = now;
    lastPublishedCount.current = next.count;
    setSnapshot(next);
  }, []);

  const start = useCallback(
    (mode: PoseDriveMode, options?: PoseSessionStartOptions) => {
      const preserveCounter =
        options?.preserveCounter === true && mode === 'live';

      if (!preserveCounter) {
        reset();
        setDriveMode(mode);
        liveCounterRef.current = new QuickPoseThresholdCounter();
        guidedCounterRef.current = new PushupCounter();
      } else {
        clearTick();
        setDriveMode(mode);
        sessionOriginMs.current = Date.now();
        lastEmitMs.current = 0;
        setElapsedSeconds(0);
      }

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
    [clearTick, ingestFrame, reset],
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
    ingestQuickPose,
  };
}
