/** MoveNet SinglePose Lightning expects a square RGB uint8 tensor. */
export const MOVENET_INPUT_SIZE = 192;

/**
 * COCO keypoint indices MoveNet emits as [y, x, score] triples.
 * Aligned with {@link PoseLandmarkIndex} names we already count on.
 */
export const MOVENET_KEYPOINT = {
  nose: 0,
  leftShoulder: 5,
  rightShoulder: 6,
  leftElbow: 7,
  rightElbow: 8,
  leftWrist: 9,
  rightWrist: 10,
  leftHip: 11,
  rightHip: 12,
} as const;

export type MoveNetKeypointName = keyof typeof MOVENET_KEYPOINT;

/**
 * Map a flat MoveNet output (length 17×3, [y,x,score] rows) into a PoseFrame.
 * x/y are normalized to [0,1] of the square model input.
 */
export function mapMoveNetOutput(
  output: ArrayLike<number>,
  timestampMs: number,
): import('./landmarks').PoseFrame {
  const points: import('./landmarks').PoseFrame['points'] = {};

  for (const [name, index] of Object.entries(MOVENET_KEYPOINT) as [
    MoveNetKeypointName,
    number,
  ][]) {
    const base = index * 3;
    const y = output[base];
    const x = output[base + 1];
    const score = output[base + 2];

    if (x == null || y == null || Number.isNaN(x) || Number.isNaN(y)) {
      continue;
    }

    points[name] = {
      x,
      y,
      score: score ?? 0,
    };
  }

  return { timestampMs, points };
}
