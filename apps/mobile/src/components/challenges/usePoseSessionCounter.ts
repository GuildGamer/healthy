import type { MatchMetric } from '@product/contract/match-board';
import { MATCH_METRIC_MEASURE } from '@product/contract/match-board';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PushupCounterSnapshot } from '@/lib/pose/pushup-counter';
import {
  createHoldTimer,
  tickHoldTimer,
  type QuickPoseHoldState,
} from '@/lib/pose/quickpose-hold-timer';
import {
  exerciseFormFeedback,
  exerciseMeasureFromResults,
  insideMeasureFromResults,
  quickPoseFraming,
  snapshotFromQuickPose,
  type QuickPoseExerciseUpdate,
} from '@/lib/pose/quickpose-exercise';
import { QuickPoseThresholdCounter } from '@/lib/pose/quickpose-threshold-counter';

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

/** Live pose counting via QuickPose fitness features + threshold hysteresis or hold timer. */
export function usePoseSessionCounter(options: PoseSessionCounterOptions = {}) {
  const metric = options.metric ?? 'pushups';
  const isHold = MATCH_METRIC_MEASURE[metric] === 'seconds';
  const liveCounterRef = useRef(new QuickPoseThresholdCounter());
  const holdRef = useRef<QuickPoseHoldState>(createHoldTimer());
  const lastTickMs = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionOriginMs = useRef(0);
  const [snapshot, setSnapshot] = useState<PushupCounterSnapshot>(EMPTY_SNAPSHOT);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const lastEmitMs = useRef(0);
  const lastPublishedCount = useRef(0);
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
    liveCounterRef.current.reset();
    holdRef.current = createHoldTimer();
    lastTickMs.current = 0;
    setSnapshot(EMPTY_SNAPSHOT);
    setElapsedSeconds(0);
    sessionOriginMs.current = Date.now();
    lastEmitMs.current = 0;
    lastPublishedCount.current = 0;
  }, [clearTick]);

  const ingestQuickPose = useCallback(
    (update: QuickPoseExerciseUpdate) => {
      const activeMetric = metricRef.current;
      const holdMode = MATCH_METRIC_MEASURE[activeMetric] === 'seconds';
      const measure = exerciseMeasureFromResults(activeMetric, update.results);
      const insideMeasure = insideMeasureFromResults(update.results);
      const formFeedback = exerciseFormFeedback(activeMetric, update.feedbacks);
      const framingFeedback = update.feedbacks['inside.wholeBody'] ?? null;
      const framing = quickPoseFraming({ measure, insideMeasure });

      if (holdMode) {
        const now = Date.now();
        const deltaSeconds =
          lastTickMs.current > 0 ? Math.min(0.25, (now - lastTickMs.current) / 1000) : 0;
        lastTickMs.current = now;
        holdRef.current = tickHoldTimer(holdRef.current, {
          measure,
          bodyInFrame: framing.bodyInFrame,
          formFeedback,
          deltaSeconds,
        });
        const next: PushupCounterSnapshot = {
          ...EMPTY_SNAPSHOT,
          count: holdRef.current.seconds,
          phase: holdRef.current.isHolding ? 'down' : 'up',
          downness: measure ?? 0,
          bodyInFrame: framing.bodyInFrame,
          visibilityRatio: framing.bodyInFrame ? 1 : 0,
          calibrationProgress: 1,
          movementRange: measure ?? 0,
          tooClose: framing.tooClose,
          rejectReason: framing.bodyInFrame ? 'none' : 'framing',
          coachPrompt: formFeedback ?? framingFeedback,
        };
        const countChanged = next.count !== lastPublishedCount.current;
        if (!countChanged && now - lastEmitMs.current < 66) {
          return;
        }
        lastEmitMs.current = now;
        lastPublishedCount.current = next.count;
        setSnapshot(next);
        return;
      }

      const finishingRep = liveCounterRef.current.state.isEntered;
      if (measure != null && formFeedback == null && (!framing.tooClose || finishingRep)) {
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
    },
    [],
  );

  const start = useCallback(
    (startOptions?: PoseSessionStartOptions) => {
      const preserveCounter = startOptions?.preserveCounter === true;

      if (!preserveCounter) {
        reset();
        liveCounterRef.current = new QuickPoseThresholdCounter();
        holdRef.current = createHoldTimer();
      } else {
        sessionOriginMs.current = Date.now();
        lastTickMs.current = Date.now();
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
    ingestQuickPose,
    isHold,
  };
}
