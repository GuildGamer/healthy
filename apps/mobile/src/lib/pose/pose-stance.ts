import type { MatchMetric } from '@product/contract/match-board';
import { isPoseMetric } from '@product/contract/match-board';
import type { PoseFrame, PosePoint } from './landmarks';
import { averagePoint } from './landmarks';
import {
  hasPushupFraming,
  looksLikeKneelingUpright,
  looksLikeStandingUp,
  shoulderMidpoint,
} from './pushup-form';

export const STANCE_MIN_LANDMARK_SCORE = 0.2;
export const STANCE_COACH_PROMPT = 'Get into position';

/** Upright torso (hip below shoulder) for standing exercises. */
const UPRIGHT_TORSO_MIN = 0.22;
/** Lying / floor work keeps a short shoulder–hip gap. */
const SUPINE_TORSO_MAX = 0.32;
/** Split stance: front knee clearly lower than the other. */
const LUNGE_KNEE_Y_GAP = 0.06;
/** Mountain climber: one knee pulled toward the hips. */
const CLIMBER_KNEE_HIP_MAX = 0.16;

export type StanceReason = 'standing' | 'upright' | 'seated' | 'no_pose';

export type StanceVerdict =
  | { ok: true }
  | { ok: false; reason: StanceReason };

function pointUsable(point: PosePoint | undefined, minScore: number): point is PosePoint {
  return point != null && point.score >= minScore;
}

function hipMidpoint(frame: PoseFrame, minScore: number): PosePoint | null {
  return averagePoint(
    pointUsable(frame.points.leftHip, minScore) ? frame.points.leftHip : undefined,
    pointUsable(frame.points.rightHip, minScore) ? frame.points.rightHip : undefined,
  );
}

function torsoSpan(frame: PoseFrame, minScore: number): number | null {
  const shoulder = shoulderMidpoint(frame, minScore);
  const hip = hipMidpoint(frame, minScore);
  if (!shoulder || !hip) {
    return null;
  }
  return hip.y - shoulder.y;
}

function bothAnklesVisible(frame: PoseFrame, minScore: number): boolean {
  return (
    pointUsable(frame.points.leftAnkle, minScore) &&
    pointUsable(frame.points.rightAnkle, minScore)
  );
}

function bothWristsVisible(frame: PoseFrame, minScore: number): boolean {
  return (
    pointUsable(frame.points.leftWrist, minScore) &&
    pointUsable(frame.points.rightWrist, minScore)
  );
}

function looksLikePronePress(frame: PoseFrame, minScore: number): boolean {
  if (!hasPushupFraming(frame, minScore)) {
    return false;
  }
  if (looksLikeStandingUp(frame, minScore) || looksLikeKneelingUpright(frame, minScore)) {
    return false;
  }
  return true;
}

function looksLikeUprightStand(frame: PoseFrame, minScore: number): boolean {
  const span = torsoSpan(frame, minScore);
  if (span == null || span < UPRIGHT_TORSO_MIN) {
    return false;
  }
  if (looksLikeKneelingUpright(frame, minScore) && !bothAnklesVisible(frame, minScore)) {
    return false;
  }
  return true;
}

function looksLikeSupineSitUp(frame: PoseFrame, minScore: number): boolean {
  const shoulder = shoulderMidpoint(frame, minScore);
  const hip = hipMidpoint(frame, minScore);
  if (!shoulder || !hip) {
    return false;
  }
  if (looksLikeStandingUp(frame, minScore) || looksLikeKneelingUpright(frame, minScore)) {
    return false;
  }
  const span = hip.y - shoulder.y;
  // Flat or slight sit-up: hips stay low relative to a long standing torso.
  return span <= SUPINE_TORSO_MAX || (shoulder.y > 0.35 && hip.y > shoulder.y);
}

function looksLikeSquatStand(frame: PoseFrame, minScore: number): boolean {
  if (!looksLikeUprightStand(frame, minScore)) {
    return false;
  }
  const shoulder = shoulderMidpoint(frame, minScore);
  const hip = hipMidpoint(frame, minScore);
  if (!shoulder || !hip) {
    return false;
  }
  // Reject lying down (hips and shoulders both high in the frame = floor work
  // from a top-down view is rare; reject very short torso as seated/lying).
  if (hip.y - shoulder.y < UPRIGHT_TORSO_MIN) {
    return false;
  }
  return true;
}

function looksLikeJumpingJack(frame: PoseFrame, minScore: number): boolean {
  return (
    looksLikeUprightStand(frame, minScore) &&
    bothWristsVisible(frame, minScore) &&
    bothAnklesVisible(frame, minScore)
  );
}

function looksLikeLunge(frame: PoseFrame, minScore: number): boolean {
  if (!looksLikeUprightStand(frame, minScore)) {
    return false;
  }
  const leftKnee = frame.points.leftKnee;
  const rightKnee = frame.points.rightKnee;
  if (!pointUsable(leftKnee, minScore) || !pointUsable(rightKnee, minScore)) {
    return false;
  }
  return Math.abs(leftKnee.y - rightKnee.y) >= LUNGE_KNEE_Y_GAP;
}

function looksLikeMountainClimber(frame: PoseFrame, minScore: number): boolean {
  if (!looksLikePronePress(frame, minScore)) {
    return false;
  }
  const hip = hipMidpoint(frame, minScore);
  if (!hip) {
    return false;
  }
  const leftKnee = frame.points.leftKnee;
  const rightKnee = frame.points.rightKnee;
  const leftClose =
    pointUsable(leftKnee, minScore) && Math.abs(leftKnee.y - hip.y) <= CLIMBER_KNEE_HIP_MAX;
  const rightClose =
    pointUsable(rightKnee, minScore) && Math.abs(rightKnee.y - hip.y) <= CLIMBER_KNEE_HIP_MAX;
  // Either a pulled knee or a clean plank base (both knees back) is acceptable.
  if (leftClose || rightClose) {
    return true;
  }
  return (
    pointUsable(leftKnee, minScore) &&
    pointUsable(rightKnee, minScore) &&
    leftKnee.y > hip.y &&
    rightKnee.y > hip.y
  );
}

function looksLikeBurpee(frame: PoseFrame, minScore: number): boolean {
  return looksLikePronePress(frame, minScore) || looksLikeSquatStand(frame, minScore);
}

/**
 * Whether the skeleton looks like the exercise being counted.
 * Callers that drive live counting should use `resolveCountingStance`, which
 * fails open when native landmarks are unavailable (stale binary / empty map).
 */
export function poseStance(metric: MatchMetric, frame: PoseFrame | null): StanceVerdict {
  if (!isPoseMetric(metric)) {
    return { ok: false, reason: 'no_pose' };
  }
  if (frame == null) {
    return { ok: false, reason: 'no_pose' };
  }

  const minScore = STANCE_MIN_LANDMARK_SCORE;
  const shoulder = shoulderMidpoint(frame, minScore);
  if (!shoulder) {
    return { ok: false, reason: 'no_pose' };
  }

  switch (metric) {
    case 'pushups':
    case 'plank':
      // Hard-block only clear upright fakes (standing / kneeling-wave).
      // Do not require hasPushupFraming / prone-press shape — front-camera
      // mid-rep and partial skeletons fail that check and blocked real
      // TestFlight counting while local Metro still looked fine.
      if (looksLikeStandingUp(frame, minScore)) {
        return { ok: false, reason: 'standing' };
      }
      if (looksLikeKneelingUpright(frame, minScore)) {
        return { ok: false, reason: 'upright' };
      }
      return { ok: true };
    case 'sit_ups':
      if (looksLikeStandingUp(frame, minScore) || looksLikeKneelingUpright(frame, minScore)) {
        return { ok: false, reason: 'upright' };
      }
      return looksLikeSupineSitUp(frame, minScore)
        ? { ok: true }
        : { ok: false, reason: 'upright' };
    case 'squats':
      if (looksLikeKneelingUpright(frame, minScore) && !bothAnklesVisible(frame, minScore)) {
        return { ok: false, reason: 'seated' };
      }
      return looksLikeSquatStand(frame, minScore)
        ? { ok: true }
        : { ok: false, reason: 'seated' };
    case 'jumping_jacks':
      return looksLikeJumpingJack(frame, minScore)
        ? { ok: true }
        : { ok: false, reason: 'upright' };
    case 'burpees':
      if (looksLikeKneelingUpright(frame, minScore) && !looksLikePronePress(frame, minScore)) {
        return { ok: false, reason: 'upright' };
      }
      return looksLikeBurpee(frame, minScore) ? { ok: true } : { ok: false, reason: 'upright' };
    case 'mountain_climbers':
      if (looksLikeStandingUp(frame, minScore) || looksLikeKneelingUpright(frame, minScore)) {
        return { ok: false, reason: 'standing' };
      }
      return looksLikeMountainClimber(frame, minScore)
        ? { ok: true }
        : { ok: false, reason: 'upright' };
    case 'lunges':
      return looksLikeLunge(frame, minScore) ? { ok: true } : { ok: false, reason: 'upright' };
    default:
      return { ok: false, reason: 'no_pose' };
  }
}

/**
 * Stance gate for live rep / hold counting.
 *
 * Only rejects when native landmarks are present and usable. Missing bridges
 * (JS update on an older binary, empty joint map) fail open so QuickPose
 * fitness scores still count — kneeling-wave rejection needs landmarks.
 */
export function resolveCountingStance(input: {
  metric: MatchMetric;
  frame: PoseFrame | null;
  landmarksAvailable?: boolean;
}): StanceVerdict {
  if (input.landmarksAvailable !== true || input.frame == null) {
    return { ok: true };
  }
  return poseStance(input.metric, input.frame);
}
