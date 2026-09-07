import type { PushupCounterSnapshot } from './pushup-counter';
import type { QuickPoseCountState } from './quickpose-threshold-counter';

export const QUICKPOSE_PUSHUP_FEATURE = 'fitness.pushUps';
export const QUICKPOSE_INSIDE_FEATURE = 'inside.wholeBody';
export const QUICKPOSE_OVERLAY_FEATURE = 'overlay.wholeBody';

export const QUICKPOSE_PUSHUP_FEATURES = [
  QUICKPOSE_PUSHUP_FEATURE,
  QUICKPOSE_OVERLAY_FEATURE,
  QUICKPOSE_INSIDE_FEATURE,
] as const;

/** Matches the green inside-box style: nearly every joint must sit in frame. */
export const QUICKPOSE_INSIDE_IN_FRAME = 0.95;

export type QuickPosePushupUpdate = {
  results: Record<string, number>;
  feedbacks: Record<string, string>;
};

export function pushupMeasureFromResults(
  results: Record<string, number>,
): number | null {
  const value = results[QUICKPOSE_PUSHUP_FEATURE];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * QuickPose form feedback for the exercise (not the framing box). When this
 * is set, the official sample skips counting so partial reps stay out.
 */
export function pushupFormFeedback(
  feedbacks: Record<string, string>,
): string | null {
  const prompt = feedbacks[QUICKPOSE_PUSHUP_FEATURE];
  return typeof prompt === 'string' && prompt.length > 0 ? prompt : null;
}

export function insideMeasureFromResults(
  results: Record<string, number>,
): number | null {
  const value = results[QUICKPOSE_INSIDE_FEATURE];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function quickPoseFraming(input: {
  measure: number | null;
  insideMeasure: number | null;
}): { tooClose: boolean; bodyInFrame: boolean } {
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
