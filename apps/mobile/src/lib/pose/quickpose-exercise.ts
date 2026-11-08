import type { MatchMetric } from '@product/contract/match-board';
import { isPoseMetric } from '@product/contract/match-board';
import type { QuickPoseLandmarks } from 'quickpose-camera';
import type { PushupCounterSnapshot } from './pushup-counter';
import type { QuickPoseCountState } from './quickpose-threshold-counter';

export const QUICKPOSE_INSIDE_FEATURE = 'inside.wholeBody';
export const QUICKPOSE_OVERLAY_FEATURE = 'overlay.wholeBody';

/** QuickPose fitness feature keys for each camera-counted contest metric. */
export const QUICKPOSE_FEATURE_BY_METRIC: Record<
  Exclude<MatchMetric, 'walk'>,
  string
> = {
  pushups: 'fitness.pushUps',
  squats: 'fitness.squats',
  plank: 'fitness.plank',
  jumping_jacks: 'fitness.jumpingJacks',
  burpees: 'fitness.burpees',
  sit_ups: 'fitness.sitUps',
  mountain_climbers: 'fitness.mountainClimbers',
  /** Left/right are separate SDK features; see quickPoseFeaturesFor. */
  lunges: 'fitness.lunges.left',
};

const QUICKPOSE_LUNGES_FEATURES = [
  'fitness.lunges.left',
  'fitness.lunges.right',
] as const;

/** Matches the green inside-box style: nearly every joint must sit in frame. */
export const QUICKPOSE_INSIDE_IN_FRAME = 0.95;

/**
 * Hold metrics (plank) use a looser bar so partial crop still accrues seconds.
 * Reps keep the stricter green-box line above.
 */
export const QUICKPOSE_INSIDE_IN_FRAME_HOLD = 0.88;

export type QuickPoseExerciseUpdate = {
  results: Record<string, number>;
  feedbacks: Record<string, string>;
  landmarks?: QuickPoseLandmarks;
  landmarksAvailable?: boolean;
};

export function quickPoseFeaturesFor(metric: MatchMetric): readonly string[] {
  if (!isPoseMetric(metric)) {
    return [QUICKPOSE_OVERLAY_FEATURE, QUICKPOSE_INSIDE_FEATURE];
  }

  if (metric === 'lunges') {
    return [...QUICKPOSE_LUNGES_FEATURES, QUICKPOSE_OVERLAY_FEATURE, QUICKPOSE_INSIDE_FEATURE];
  }

  return [
    QUICKPOSE_FEATURE_BY_METRIC[metric],
    QUICKPOSE_OVERLAY_FEATURE,
    QUICKPOSE_INSIDE_FEATURE,
  ];
}

function finiteResult(results: Record<string, number>, key: string): number | null {
  const value = results[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function exerciseMeasureFromResults(
  metric: MatchMetric,
  results: Record<string, number>,
): number | null {
  if (!isPoseMetric(metric)) {
    return null;
  }

  if (metric === 'lunges') {
    const sides = QUICKPOSE_LUNGES_FEATURES.map((key) => finiteResult(results, key)).filter(
      (value): value is number => value != null,
    );
    if (sides.length === 0) {
      return null;
    }
    return Math.max(...sides);
  }

  return finiteResult(results, QUICKPOSE_FEATURE_BY_METRIC[metric]);
}

export function exerciseFormFeedback(
  metric: MatchMetric,
  feedbacks: Record<string, string>,
): string | null {
  if (!isPoseMetric(metric)) {
    return null;
  }

  if (metric === 'lunges') {
    for (const key of QUICKPOSE_LUNGES_FEATURES) {
      const prompt = feedbacks[key];
      if (typeof prompt === 'string' && prompt.length > 0) {
        return prompt;
      }
    }
    return null;
  }

  const prompt = feedbacks[QUICKPOSE_FEATURE_BY_METRIC[metric]];
  return typeof prompt === 'string' && prompt.length > 0 ? prompt : null;
}

export function insideMeasureFromResults(results: Record<string, number>): number | null {
  const value = results[QUICKPOSE_INSIDE_FEATURE];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function quickPoseFraming(input: {
  measure: number | null;
  insideMeasure: number | null;
  /** Defaults to the strict green-box line; holds pass a looser threshold. */
  insideWellFramedThreshold?: number;
}): {
  tooClose: boolean;
  bodyInFrame: boolean;
} {
  // A push-up score alone is not a body — only inside.wholeBody means QuickPose
  // found a person. Missing that reading keeps the green box empty.
  if (input.insideMeasure == null) {
    return { tooClose: false, bodyInFrame: false };
  }

  const threshold = input.insideWellFramedThreshold ?? QUICKPOSE_INSIDE_IN_FRAME;
  const wellFramed = input.insideMeasure >= threshold;
  return {
    tooClose: !wellFramed,
    bodyInFrame: wellFramed,
  };
}

/** Shown when a half-rep is armed but nothing else is coaching. */
export const POSE_COME_ALL_THE_WAY_UP = 'Come all the way up.';

/**
 * Whether this frame may move the rep counter. Needs a body reading from
 * QuickPose and an accepted stance; a finishing half-rep may complete if the
 * body/landmarks flicker after a good enter. The 0.95 green-box line is
 * coaching only — any positive inside score counts once stance is ok.
 */
export function shouldCountPoseRep(input: {
  measure: number | null;
  insideMeasure: number | null;
  formFeedback: string | null;
  finishingRep: boolean;
  stanceOk: boolean;
  /** True if any prior frame in this half-rep had an accepted stance. */
  finishingStanceOk: boolean;
}): boolean {
  if (input.measure == null || input.formFeedback != null) {
    return false;
  }

  if (input.finishingRep) {
    return input.finishingStanceOk;
  }

  if (!input.stanceOk) {
    return false;
  }

  return input.insideMeasure != null && input.insideMeasure > 0;
}

export function snapshotFromQuickPose(input: {
  measure: number | null;
  insideMeasure: number | null;
  formFeedback: string | null;
  framingFeedback: string | null;
  stanceFeedback: string | null;
  counter: QuickPoseCountState;
}): PushupCounterSnapshot {
  const framing = quickPoseFraming({
    measure: input.measure,
    insideMeasure: input.insideMeasure,
  });
  const downness = input.measure ?? 0;
  const explicitCoach =
    input.formFeedback ?? input.framingFeedback ?? input.stanceFeedback;
  const coachPrompt =
    explicitCoach ??
    (input.counter.isEntered ? POSE_COME_ALL_THE_WAY_UP : null);

  return {
    count: input.counter.count,
    phase: input.counter.isEntered ? 'down' : 'up',
    downness,
    bodyInFrame: framing.bodyInFrame,
    visibilityRatio: framing.bodyInFrame ? 1 : 0,
    calibrating: false,
    calibrationProgress: 1,
    movementRange: downness,
    movementTooSmall: false,
    tooClose: framing.tooClose,
    rejectReason: framing.bodyInFrame ? 'none' : 'framing',
    debugFrame: null,
    coachPrompt,
  };
}

/** @deprecated Prefer quickPoseFeaturesFor('pushups'). */
export const QUICKPOSE_PUSHUP_FEATURE = QUICKPOSE_FEATURE_BY_METRIC.pushups;
export const QUICKPOSE_PUSHUP_FEATURES = quickPoseFeaturesFor('pushups');
export type QuickPosePushupUpdate = QuickPoseExerciseUpdate;
export const pushupMeasureFromResults = (results: Record<string, number>) =>
  exerciseMeasureFromResults('pushups', results);
export const pushupFormFeedback = (feedbacks: Record<string, string>) =>
  exerciseFormFeedback('pushups', feedbacks);
