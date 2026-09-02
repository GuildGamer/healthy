import { elbowDownness, jointAngleDegrees } from './elbow-angle';
import { averagePoint, type PoseFrame, type PosePoint } from './landmarks';

export type PushupCalibration = {
  /** Shoulder midpoint y at the top of a rep (lower value = higher in frame). */
  topShoulderY: number;
  /** Shoulder midpoint x at the top — used to reject lateral sway. */
  topShoulderX: number;
  /** Mean |wrist.y − shoulder.y| at the top — larger when arms are extended. */
  topWristSpread: number;
  /** Nose y at the top — useful when arms leave the frame on the way down. */
  topNoseY: number;
};

/** Minimum fused downness swing before adaptive thresholds engage. */
export const MIN_FUSED_MOVEMENT_RANGE = 0.1;

/** Adaptive depth gate — must reach this fraction of the observed swing. */
export const ADAPTIVE_DEPTH_RATIO = 0.6;

/** Adaptive return gate — count once back below this fraction of the swing. */
export const ADAPTIVE_RETURN_RATIO = 0.38;

/** Do not personalize bands until the user has shown a real push-up swing. */
export const MIN_ADAPTIVE_DEPTH_RANGE = 0.22;

/** Minimum raw shoulder drop (normalized coords) to trust counting. */
export const MIN_TORSO_DROP_SPAN = 0.035;

/** Minimum wrist compression span for normalization. */
export const MIN_WRIST_COMPRESSION_SPAN = 0.015;

/** Legacy fixed span — used only in unit tests. */
export const FRONT_TORSO_DROP_SPAN = 0.1;

/** Front-camera channel weights — torso/nose dominate over elbow. */
export const FRONT_CHANNEL_WEIGHTS = {
  torso: 0.45,
  wrist: 0.3,
  nose: 0.15,
  elbow: 0.1,
} as const;

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function pointUsable(point: PosePoint | undefined, minScore: number): point is PosePoint {
  return point != null && point.score >= minScore;
}

export function normalizeBySessionMax(
  raw: number,
  sessionMax: number,
  floor: number,
): number {
  const span = Math.max(floor, sessionMax);
  if (span <= 0) {
    return 0;
  }

  return clamp01(raw / span);
}

/** Best elbow flexion signal from either arm chain. */
export function elbowArmDownness(
  frame: PoseFrame,
  minScore: number,
): number | null {
  const left = sideElbowDownness(
    frame.points.leftShoulder,
    frame.points.leftElbow,
    frame.points.leftWrist,
    minScore,
  );
  const right = sideElbowDownness(
    frame.points.rightShoulder,
    frame.points.rightElbow,
    frame.points.rightWrist,
    minScore,
  );

  if (left === null && right === null) {
    return null;
  }

  if (left !== null && right !== null) {
    return Math.max(left, right);
  }

  return left ?? right;
}

function sideElbowDownness(
  shoulder: PosePoint | undefined,
  elbow: PosePoint | undefined,
  wrist: PosePoint | undefined,
  minScore: number,
): number | null {
  if (
    !pointUsable(shoulder, minScore) ||
    !pointUsable(elbow, minScore) ||
    !pointUsable(wrist, minScore)
  ) {
    return null;
  }

  return elbowDownness(jointAngleDegrees(shoulder, elbow, wrist));
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

function meanWristSpread(frame: PoseFrame, minScore: number): number | null {
  const spreads: number[] = [];

  for (const side of ['left', 'right'] as const) {
    const shoulder = frame.points[`${side}Shoulder`];
    const wrist = frame.points[`${side}Wrist`];
    if (!pointUsable(shoulder, minScore) || !pointUsable(wrist, minScore)) {
      continue;
    }

    spreads.push(Math.abs(wrist.y - shoulder.y));
  }

  if (spreads.length === 0) {
    return null;
  }

  return spreads.reduce((sum, value) => sum + value, 0) / spreads.length;
}

export function rawTorsoDrop(
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

  return Math.max(0, shoulder.y - calibration.topShoulderY);
}

export function rawWristCompression(
  frame: PoseFrame,
  calibration: PushupCalibration | null,
  minScore: number,
): number | null {
  if (!calibration || calibration.topWristSpread < 0.02) {
    return null;
  }

  const spread = meanWristSpread(frame, minScore);
  if (spread === null) {
    return null;
  }

  return Math.max(0, calibration.topWristSpread - spread);
}

export function rawNoseDrop(
  frame: PoseFrame,
  calibration: PushupCalibration | null,
  minScore: number,
): number | null {
  if (!calibration) {
    return null;
  }

  const nose = frame.points.nose;
  if (!pointUsable(nose, minScore)) {
    return null;
  }

  return Math.max(0, nose.y - calibration.topNoseY);
}

export type PushupChannelSample = {
  torso: number | null;
  wrist: number | null;
  nose: number | null;
  elbow: number | null;
};

/** Normalize raw front-camera channels using expanding session maximums. */
export function fuseFrontPushupChannels(
  sample: PushupChannelSample,
  sessionMax: {
    torso: number;
    wrist: number;
    nose: number;
  },
): number | null {
  const weighted: number[] = [];

  if (sample.torso !== null) {
    weighted.push(
      FRONT_CHANNEL_WEIGHTS.torso *
        normalizeBySessionMax(
          sample.torso,
          sessionMax.torso,
          MIN_TORSO_DROP_SPAN,
        ),
    );
  }

  if (sample.wrist !== null) {
    weighted.push(
      FRONT_CHANNEL_WEIGHTS.wrist *
        normalizeBySessionMax(
          sample.wrist,
          sessionMax.wrist,
          MIN_WRIST_COMPRESSION_SPAN,
        ),
    );
  }

  if (sample.nose !== null) {
    weighted.push(
      FRONT_CHANNEL_WEIGHTS.nose *
        normalizeBySessionMax(sample.nose, sessionMax.nose, MIN_TORSO_DROP_SPAN),
    );
  }

  if (sample.elbow !== null) {
    weighted.push(FRONT_CHANNEL_WEIGHTS.elbow * sample.elbow);
  }

  if (weighted.length === 0) {
    return null;
  }

  const weightSum =
    (sample.torso !== null ? FRONT_CHANNEL_WEIGHTS.torso : 0) +
    (sample.wrist !== null ? FRONT_CHANNEL_WEIGHTS.wrist : 0) +
    (sample.nose !== null ? FRONT_CHANNEL_WEIGHTS.nose : 0) +
    (sample.elbow !== null ? FRONT_CHANNEL_WEIGHTS.elbow : 0);

  if (weightSum <= 0) {
    return null;
  }

  return clamp01(weighted.reduce((sum, value) => sum + value, 0) / weightSum);
}

/**
 * Front-camera signal: shoulders drop in the frame as the chest lowers.
 * @deprecated Prefer fuseFrontPushupChannels with session max tracking.
 */
export function torsoDropDownness(
  frame: PoseFrame,
  calibration: PushupCalibration | null,
  minScore: number,
): number | null {
  const drop = rawTorsoDrop(frame, calibration, minScore);
  if (drop === null) {
    return null;
  }

  return clamp01(drop / FRONT_TORSO_DROP_SPAN);
}

/**
 * Front-camera signal: wrists rise toward shoulder height at the bottom.
 * @deprecated Prefer fuseFrontPushupChannels with session max tracking.
 */
export function wristSpreadDownness(
  frame: PoseFrame,
  calibration: PushupCalibration | null,
  minScore: number,
): number | null {
  const compression = rawWristCompression(frame, calibration, minScore);
  if (compression === null || !calibration) {
    return null;
  }

  return clamp01(compression / calibration.topWristSpread);
}

/** Fuse independent downness channels — best for mixed front / slight-side framing. */
export function fusePushupDownness(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return Math.max(...values);
}

export function resolveAdaptiveThresholds(
  sessionMin: number,
  sessionMax: number,
  fallbackDown: number,
  fallbackUp: number,
): { down: number; up: number } {
  const span = sessionMax - sessionMin;
  if (span < MIN_ADAPTIVE_DEPTH_RANGE) {
    return { down: fallbackDown, up: fallbackUp };
  }

  return {
    down: sessionMin + ADAPTIVE_DEPTH_RATIO * span,
    up: sessionMin + ADAPTIVE_RETURN_RATIO * span,
  };
}

/** Sample top-of-rep baselines while the user holds the extended position. */
export function sampleCalibration(
  frame: PoseFrame,
  minScore: number,
): PushupCalibration | null {
  const shoulder = shoulderMidpoint(frame, minScore);
  const spread = meanWristSpread(frame, minScore);
  const nose = frame.points.nose;
  if (!shoulder || spread === null || !pointUsable(nose, minScore)) {
    return null;
  }

  return {
    topShoulderY: shoulder.y,
    topShoulderX: shoulder.x,
    topWristSpread: spread,
    topNoseY: nose.y,
  };
}

/** Merge calibration samples — keep the highest body position (smallest y). */
export function mergeCalibration(
  current: PushupCalibration | null,
  sample: PushupCalibration,
): PushupCalibration {
  if (!current) {
    return sample;
  }

  const useSampleTop = sample.topShoulderY <= current.topShoulderY;

  return {
    topShoulderY: Math.min(current.topShoulderY, sample.topShoulderY),
    topShoulderX: useSampleTop ? sample.topShoulderX : current.topShoulderX,
    topWristSpread: Math.max(current.topWristSpread, sample.topWristSpread),
    topNoseY: Math.min(current.topNoseY, sample.topNoseY),
  };
}

/** True when at least shoulders are visible enough to attempt tracking. */
export function hasTorsoTracking(
  frame: PoseFrame,
  minScore: number,
): boolean {
  return shoulderMidpoint(frame, minScore) !== null;
}
