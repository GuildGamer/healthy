import type { PoseFrame, PosePoint } from './landmarks';

const UP_POSE = {
  shoulder: { x: 0.55, y: 0.32 },
  elbow: { x: 0.45, y: 0.48 },
  wrist: { x: 0.35, y: 0.64 },
  hip: { x: 0.72, y: 0.4 },
} as const;

const DOWN_POSE = {
  shoulder: { x: 0.52, y: 0.48 },
  elbow: { x: 0.28, y: 0.45 },
  wrist: { x: 0.35, y: 0.64 },
  hip: { x: 0.7, y: 0.46 },
} as const;

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

function lerpPoint(
  from: { x: number; y: number },
  to: { x: number; y: number },
  amount: number,
): PosePoint {
  return {
    x: lerp(from.x, to.x, amount),
    y: lerp(from.y, to.y, amount),
    score: 0.95,
  };
}

/**
 * Synthetic side-view push-up landmarks for simulator / unit demos.
 * Depth 0 ≈ arms extended (~180°); depth 1 ≈ deep bend (~63°).
 */
export function syntheticPushupFrame(
  timestampMs: number,
  /** 0 = top, 1 = bottom of the rep. */
  depth: number,
): PoseFrame {
  const clamped = Math.min(1, Math.max(0, depth));
  const shoulder = lerpPoint(UP_POSE.shoulder, DOWN_POSE.shoulder, clamped);
  const elbow = lerpPoint(UP_POSE.elbow, DOWN_POSE.elbow, clamped);
  const wrist = lerpPoint(UP_POSE.wrist, DOWN_POSE.wrist, clamped);
  const hip = lerpPoint(UP_POSE.hip, DOWN_POSE.hip, clamped);
  const mirror = (point: PosePoint, offset = 0.03): PosePoint => ({
    x: point.x + offset,
    y: point.y,
    score: point.score,
  });

  return {
    timestampMs,
    points: {
      nose: { x: shoulder.x - 0.02, y: shoulder.y - 0.08, score: 0.95 },
      leftShoulder: shoulder,
      rightShoulder: mirror(shoulder),
      leftElbow: elbow,
      rightElbow: mirror(elbow),
      leftWrist: wrist,
      rightWrist: mirror(wrist),
      leftHip: hip,
      rightHip: mirror(hip),
    },
  };
}

/** Plays a smooth UP→DOWN→UP cycle over `cycleMs`. */
export function syntheticPushupDepth(
  timestampMs: number,
  cycleMs = 1_200,
): number {
  const phase = (timestampMs % cycleMs) / cycleMs;
  if (phase < 0.5) {
    return phase * 2;
  }

  return 2 - phase * 2;
}
