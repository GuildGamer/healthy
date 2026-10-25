import type { MatchMetric } from '@product/contract/match-board';
import { isPoseMetric } from '@product/contract/match-board';
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
  lunges: 'fitness.lunges',
};

/** Matches the green inside-box style: nearly every joint must sit in frame. */
export const QUICKPOSE_INSIDE_IN_FRAME = 0.95;

export type QuickPoseExerciseUpdate = {
  results: Record<string, number>;
  feedbacks: Record<string, string>;
};

export function quickPoseFeaturesFor(metric: MatchMetric): readonly string[] {
  if (!isPoseMetric(metric)) {
    return [QUICKPOSE_OVERLAY_FEATURE, QUICKPOSE_INSIDE_FEATURE];
  }

  return [
    QUICKPOSE_FEATURE_BY_METRIC[metric],
    QUICKPOSE_OVERLAY_FEATURE,
    QUICKPOSE_INSIDE_FEATURE,
  ];
}

export function exerciseMeasureFromResults(
  metric: MatchMetric,
  results: Record<string, number>,
): number | null {
  if (!isPoseMetric(metric)) {
    return null;
  }

  const value = results[QUICKPOSE_FEATURE_BY_METRIC[metric]];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function exerciseFormFeedback(
  metric: MatchMetric,
  feedbacks: Record<string, string>,
): string | null {
  if (!isPoseMetric(metric)) {
    return null;
  }

  const prompt = feedbacks[QUICKPOSE_FEATURE_BY_METRIC[metric]];
  return typeof prompt === 'string' && prompt.length > 0 ? prompt : null;
}

export function insideMeasureFromResults(results: Record<string, number>): number | null {
  const value = results[QUICKPOSE_INSIDE_FEATURE];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function quickPoseFraming(input: { measure: number | null; insideMeasure: number | null }): {
  tooClose: boolean;
  bodyInFrame: boolean;
} {
  const personVisible = input.measure != null || input.insideMeasure != null;
  if (input.insideMeasure == null) {
    return { tooClose: false, bodyInFrame: input.measure != null };
  }

  const wellFramed = input.insideMeasure >= QUICKPOSE_INSIDE_IN_FRAME;
  return {
    tooClose: personVisible && !wellFramed,
    bodyInFrame: personVisible && wellFramed,
  };
}

export function snapshotFromQuickPose(input: {
  measure: number | null;
  insideMeasure: number | null;
  formFeedback: string | null;
  framingFeedback: string | null;
  counter: QuickPoseCountState;
}): PushupCounterSnapshot {
  const framing = quickPoseFraming({
    measure: input.measure,
    insideMeasure: input.insideMeasure,
  });
  const downness = input.measure ?? 0;
  const coachPrompt = input.formFeedback ?? input.framingFeedback;

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
