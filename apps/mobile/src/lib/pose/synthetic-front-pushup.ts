import type { PoseFrame, PosePoint } from './landmarks';

const TOP_POSE = {
  shoulderY: 0.28,
  wristSpread: 0.18,
} as const;

const BOTTOM_POSE = {
  shoulderY: 0.38,
  wristSpread: 0.06,
} as const;

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

function point(x: number, y: number): PosePoint {
  return { x, y, score: 0.92 };
}

/**
 * Synthetic front-facing push-up landmarks.
 * Elbow angle barely moves; shoulders drop and wrists rise toward shoulders.
 */
export function syntheticFrontPushupFrame(
  timestampMs: number,
  /** 0 = top, 1 = bottom */
  depth: number,
): PoseFrame {
  const clamped = Math.min(1, Math.max(0, depth));
  const shoulderY = lerp(TOP_POSE.shoulderY, BOTTOM_POSE.shoulderY, clamped);
  const spread = lerp(TOP_POSE.wristSpread, BOTTOM_POSE.wristSpread, clamped);

  const leftShoulder = point(0.42, shoulderY);
  const rightShoulder = point(0.58, shoulderY);
  const leftWrist = point(0.4, shoulderY + spread);
  const rightWrist = point(0.6, shoulderY + spread);
  const leftElbow = point(0.38, shoulderY + spread * 0.55);
  const rightElbow = point(0.62, shoulderY + spread * 0.55);

  return {
    timestampMs,
    points: {
      nose: point(0.5, shoulderY - 0.08),
      leftShoulder,
      rightShoulder,
      leftElbow,
      rightElbow,
      leftWrist,
      rightWrist,
      leftHip: point(0.44, shoulderY + 0.22),
      rightHip: point(0.56, shoulderY + 0.22),
    },
  };
}

export function syntheticFrontPushupDepth(
  timestampMs: number,
  cycleMs = 1_200,
): number {
  const phase = (timestampMs % cycleMs) / cycleMs;
  if (phase < 0.5) {
    return phase * 2;
  }

  return 2 - phase * 2;
}

/** Seed calibration by replaying top-of-rep frames. */
export function primeFrontPushupCalibration(
  counter: { ingest: (frame: PoseFrame) => unknown },
  frameCount = 24,
): void {
  for (let index = 0; index < frameCount; index += 1) {
    counter.ingest(syntheticFrontPushupFrame(index * 40, 0));
  }
}
