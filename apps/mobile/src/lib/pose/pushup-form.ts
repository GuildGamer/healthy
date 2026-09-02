import { jointAngleDegrees } from './elbow-angle';
import { averagePoint, type PoseFrame, type PosePoint } from './landmarks';
import {
  rawNoseDrop,
  rawTorsoDrop,
  rawWristCompression,
  type PushupCalibration,
} from './pushup-signals';

/** Industry-standard push-up elbow thresholds (degrees). */
export const PUSHUP_UP_ANGLE_DEG = 155;
export const PUSHUP_DOWN_ANGLE_DEG = 95;

/** Minimum elbow flexion range before elbow angle is treated as primary. */
export const MIN_ELBOW_RANGE_DEG = 22;

/** Shoulder must drop at least this much (normalized y) to validate a rep. */
export const MIN_VERTICAL_SHOULDER_DROP = 0.02;

/** Wrist compression span (raw) that supports a real press-up vs camera tilt. */
export const MIN_WRIST_COMPRESSION_FOR_REP = 0.015;

/**
 * Reject a cycle only when sideways drift clearly dominates vertical drop.
 * Front-camera push-ups always shift shoulders in x a bit — requiring
 * vertical ≥ lateral rejected almost every real rep.
 */
export const MAX_LATERAL_OVER_VERTICAL_RATIO = 2.2;

/**
 * Mean landmark jump that means the phone moved. Live MoveNet is ~8fps, so a
 * real dip can move shoulders ~0.05 in one frame — that is not camera motion.
 */
export const CAMERA_MOTION_SHIFT = 0.085;

/** Face / chest close-ups sit in a short vertical band. */
export const MIN_BODY_EXTENT = 0.24;

/** Shoulders spanning most of the frame usually means the phone is in a face. */
export const MAX_SHOULDER_WIDTH = 0.44;

/**
 * Hip-minus-shoulder y in a front plank is ~0.22. A much larger gap means the
 * body is going vertical (kneeling / standing up), not pressing.
 */
export const STANDING_TORSO_SPAN = 0.34;

export type ArmElbowReading = {
  side: 'left' | 'right';
  angleDegrees: number;
  meanScore: number;
};

function pointUsable(
  point: PosePoint | undefined,
  minScore: number,
): point is PosePoint {
  return point != null && point.score >= minScore;
}

function armElbowReading(
  side: 'left' | 'right',
  frame: PoseFrame,
  minScore: number,
): ArmElbowReading | null {
  const shoulder = frame.points[`${side}Shoulder`];
  const elbow = frame.points[`${side}Elbow`];
  const wrist = frame.points[`${side}Wrist`];

  if (
    !pointUsable(shoulder, minScore) ||
    !pointUsable(elbow, minScore) ||
    !pointUsable(wrist, minScore)
  ) {
    return null;
  }

  return {
    side,
    angleDegrees: jointAngleDegrees(shoulder, elbow, wrist),
    meanScore: (shoulder.score + elbow.score + wrist.score) / 3,
  };
}

/** Prefer the arm chain with the stronger landmark confidence. */
export function bestElbowReading(
  frame: PoseFrame,
  minScore: number,
): ArmElbowReading | null {
  const strict = Math.max(0.15, minScore);
  const relaxed = Math.max(0.12, minScore * 0.65);

  for (const score of [strict, relaxed] as const) {
    const left = armElbowReading('left', frame, score);
    const right = armElbowReading('right', frame, score);

    if (left == null && right == null) {
      continue;
    }

    if (left != null && right != null) {
      return left.meanScore >= right.meanScore ? left : right;
    }

    return left ?? right;
  }

  return null;
}

export function shoulderMidpoint(
  frame: PoseFrame,
  minScore: number,
): PosePoint | null {
  const left = frame.points.leftShoulder;
  const right = frame.points.rightShoulder;
  return averagePoint(
    pointUsable(left, minScore) ? left : undefined,
    pointUsable(right, minScore) ? right : undefined,
  );
}

export function shoulderVerticalDrop(
  frame: PoseFrame,
  calibration: PushupCalibration | null,
  minScore: number,
): number | null {
  return rawTorsoDrop(frame, calibration, minScore);
}

export function shoulderLateralOffset(
  frame: PoseFrame,
  calibration: PushupCalibration | null,
  minScore: number,
): number | null {
  if (!calibration) {
    return null;
  }

  const shoulder = shoulderMidpoint(frame, minScore);
  if (!shoulder) {
    return null;
  }

  return Math.abs(shoulder.x - calibration.topShoulderX);
}

/** Reject side-to-side sway when validating a completed rep. */
export function repPassesVerticalCheck(
  verticalDrop: number | null,
  lateralOffset: number | null,
): boolean {
  if (verticalDrop == null) {
    return false;
  }

  if (verticalDrop < MIN_VERTICAL_SHOULDER_DROP) {
    return false;
  }

  if (lateralOffset == null) {
    return true;
  }

  // Pure sway: lots of x motion, almost no y travel.
  return lateralOffset <= verticalDrop * MAX_LATERAL_OVER_VERTICAL_RATIO;
}

/**
 * Average displacement of shared landmarks between frames.
 * Large values usually mean the camera moved (picking up the phone).
 */
export function meanLandmarkShift(
  current: PoseFrame,
  previous: PoseFrame | null,
  minScore: number,
): number | null {
  if (!previous) {
    return null;
  }

  const names = [
    'nose',
    'leftShoulder',
    'rightShoulder',
    'leftHip',
    'rightHip',
    'leftWrist',
    'rightWrist',
  ] as const;

  let total = 0;
  let count = 0;

  for (const name of names) {
    const a = current.points[name];
    const b = previous.points[name];
    if (!pointUsable(a, minScore) || !pointUsable(b, minScore)) {
      continue;
    }

    total += Math.hypot(a.x - b.x, a.y - b.y);
    count += 1;
  }

  if (count < 3) {
    return null;
  }

  return total / count;
}

/** True when the scene jumped like a handheld camera, not a body rep. */
export function looksLikeCameraMotion(shift: number | null): boolean {
  return shift != null && shift >= CAMERA_MOTION_SHIFT;
}

const FRAMING_LANDMARKS = [
  'nose',
  'leftShoulder',
  'rightShoulder',
  'leftElbow',
  'rightElbow',
  'leftWrist',
  'rightWrist',
  'leftHip',
  'rightHip',
] as const;

/**
 * Full-body plank framing — rejects a face-only lock when the phone is held
 * up close. Side-on planks are short in y, so we use overall body extent.
 */
export function hasPushupFraming(
  frame: PoseFrame,
  minScore: number,
): boolean {
  const leftShoulder = frame.points.leftShoulder;
  const rightShoulder = frame.points.rightShoulder;
  if (
    !pointUsable(leftShoulder, minScore) ||
    !pointUsable(rightShoulder, minScore)
  ) {
    return false;
  }

  const hip = averagePoint(
    pointUsable(frame.points.leftHip, minScore)
      ? frame.points.leftHip
      : undefined,
    pointUsable(frame.points.rightHip, minScore)
      ? frame.points.rightHip
      : undefined,
  );
  if (!hip) {
    return false;
  }

  const shoulderWidth = Math.hypot(
    rightShoulder.x - leftShoulder.x,
    rightShoulder.y - leftShoulder.y,
  );
  if (shoulderWidth > MAX_SHOULDER_WIDTH) {
    return false;
  }

  return bodyExtent(frame, minScore) >= MIN_BODY_EXTENT;
}

function hipMidpoint(
  frame: PoseFrame,
  minScore: number,
): PosePoint | null {
  return averagePoint(
    pointUsable(frame.points.leftHip, minScore)
      ? frame.points.leftHip
      : undefined,
    pointUsable(frame.points.rightHip, minScore)
      ? frame.points.rightHip
      : undefined,
  );
}

function meanWristY(frame: PoseFrame, minScore: number): number | null {
  const ys: number[] = [];
  for (const name of ['leftWrist', 'rightWrist'] as const) {
    const point = frame.points[name];
    if (pointUsable(point, minScore)) {
      ys.push(point.y);
    }
  }

  if (ys.length === 0) {
    return null;
  }

  return ys.reduce((sum, value) => sum + value, 0) / ys.length;
}

/**
 * Plank → knees → stand: torso goes vertical and hands leave the floor.
 * A real press-up keeps a short hip–shoulder gap and wrists below the chest.
 */
export function looksLikeStandingUp(
  frame: PoseFrame,
  minScore: number,
): boolean {
  const shoulder = shoulderMidpoint(frame, minScore);
  const hip = hipMidpoint(frame, minScore);
  if (!shoulder || !hip) {
    return false;
  }

  const torsoSpan = hip.y - shoulder.y;
  if (torsoSpan >= STANDING_TORSO_SPAN) {
    return true;
  }

  const wristY = meanWristY(frame, minScore);
  if (wristY == null) {
    return false;
  }

  // Hands coming off the floor while the torso is already lengthening.
  return torsoSpan >= 0.28 && wristY <= shoulder.y + 0.03;
}

export function bodyExtent(frame: PoseFrame, minScore: number): number {
  let minY = 1;
  let maxY = 0;
  let count = 0;

  for (const name of FRAMING_LANDMARKS) {
    const point = frame.points[name];
    if (!pointUsable(point, minScore)) {
      continue;
    }
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
    count += 1;
  }

  if (count < 5) {
    return 0;
  }

  return maxY - minY;
}

/**
 * Whole skeleton translated together — holding the phone and nodding it.
 * A real press-up leaves wrists (or the floor) relatively still.
 */
export function looksLikeRigidSceneShift(
  current: PoseFrame,
  previous: PoseFrame | null,
  minScore: number,
): boolean {
  if (!previous) {
    return false;
  }

  const deltas: { dx: number; dy: number }[] = [];
  let wristPairs = 0;

  for (const name of FRAMING_LANDMARKS) {
    const a = current.points[name];
    const b = previous.points[name];
    if (!pointUsable(a, minScore) || !pointUsable(b, minScore)) {
      continue;
    }

    deltas.push({ dx: a.x - b.x, dy: a.y - b.y });
    if (name === 'leftWrist' || name === 'rightWrist') {
      wristPairs += 1;
    }
  }

  if (deltas.length < 5 || wristPairs === 0) {
    return false;
  }

  const meanDx =
    deltas.reduce((sum, item) => sum + item.dx, 0) / deltas.length;
  const meanDy =
    deltas.reduce((sum, item) => sum + item.dy, 0) / deltas.length;
  const travel = Math.hypot(meanDx, meanDy);
  if (travel < 0.028) {
    return false;
  }

  const residual =
    deltas.reduce(
      (sum, item) => sum + Math.hypot(item.dx - meanDx, item.dy - meanDy),
      0,
    ) / deltas.length;

  return residual <= travel * 0.38;
}

/** Floor / ceiling for torso-drop normalization (normalized y). */
export const FRONT_TORSO_DEPTH_FLOOR = 0.032;
export const FRONT_TORSO_DEPTH_SPAN = 0.09;

/** Floor / ceiling for wrist-compression normalization. */
export const FRONT_WRIST_DEPTH_FLOOR = 0.025;
export const FRONT_WRIST_DEPTH_SPAN = 0.08;

/** Map elbow angle to 0 (extended) .. 1 (flexed). */
export function depthFromElbowAngle(angleDegrees: number): number {
  const extended = PUSHUP_UP_ANGLE_DEG + 10;
  const flexed = PUSHUP_DOWN_ANGLE_DEG - 10;
  const span = extended - flexed;
  const raw = (extended - angleDegrees) / span;
  return Math.min(1, Math.max(0, raw));
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function boundedSpan(sessionMax: number, floor: number, ceiling: number): number {
  return Math.min(ceiling, Math.max(floor, sessionMax));
}

function channelDepth(value: number, span: number): number {
  return clamp01(value / span);
}

function weightedMean(parts: readonly { value: number; weight: number }[]): number {
  const weightSum = parts.reduce((sum, part) => sum + part.weight, 0);
  const valueSum = parts.reduce(
    (sum, part) => sum + part.value * part.weight,
    0,
  );
  return clamp01(valueSum / weightSum);
}

/**
 * Depth for the rep FSM.
 *
 * Normalize each channel by a bounded span: at least a typical small dip,
 * at most a typical full dip. An extra-deep first rep must not raise the
 * ceiling, or later identical reps look shallow and stop counting.
 *
 * Front-camera: weighted torso + wrist (+ nose as support). Elbow is fallback
 * only — front-on 2D elbow angle sits mid-range and will pin depth.
 */
export function computePushupDepth(
  frame: PoseFrame,
  calibration: PushupCalibration | null,
  sessionMax: { torso: number; wrist: number },
  minScore: number,
  elbow: ArmElbowReading | null,
): number | null {
  const parts: { value: number; weight: number }[] = [];
  const torsoSpan = boundedSpan(
    sessionMax.torso,
    FRONT_TORSO_DEPTH_FLOOR,
    FRONT_TORSO_DEPTH_SPAN,
  );
  const wristSpan = boundedSpan(
    sessionMax.wrist,
    FRONT_WRIST_DEPTH_FLOOR,
    FRONT_WRIST_DEPTH_SPAN,
  );

  if (calibration) {
    const torso = rawTorsoDrop(frame, calibration, minScore);
    if (torso != null) {
      parts.push({
        value: channelDepth(torso, torsoSpan),
        weight: 0.5,
      });
    }

    const wrist = rawWristCompression(frame, calibration, minScore);
    if (wrist != null) {
      parts.push({
        value: channelDepth(wrist, wristSpan),
        weight: 0.35,
      });
    }

    const nose = rawNoseDrop(frame, calibration, minScore);
    if (nose != null && parts.length > 0) {
      parts.push({
        value: channelDepth(nose, torsoSpan),
        weight: 0.15,
      });
    }
  }

  if (parts.length > 0) {
    return weightedMean(parts);
  }

  if (elbow) {
    return depthFromElbowAngle(elbow.angleDegrees);
  }

  return null;
}

/** @deprecated Use computePushupDepth — kept for tests migrating off min-fusion. */
export function frontDepthScore(
  frame: PoseFrame,
  calibration: PushupCalibration | null,
  sessionMax: { torso: number; wrist: number },
  minScore: number,
): number | null {
  const torso = rawTorsoDrop(frame, calibration, minScore);
  const wrist = rawWristCompression(frame, calibration, minScore);

  if (torso == null || wrist == null) {
    return null;
  }

  return Math.min(
    channelDepth(
      torso,
      boundedSpan(sessionMax.torso, FRONT_TORSO_DEPTH_FLOOR, FRONT_TORSO_DEPTH_SPAN),
    ),
    channelDepth(
      wrist,
      boundedSpan(sessionMax.wrist, FRONT_WRIST_DEPTH_FLOOR, FRONT_WRIST_DEPTH_SPAN),
    ),
  );
}
