import type { Orientation } from 'react-native-vision-camera';
import { uprightNormalizedPoint } from './frame-orientation';

/**
 * MoveNet SinglePose Thunder expects a 256×256 RGB uint8 tensor.
 * (Lightning used 192 — keep Thunder-only while we prioritize landmark quality.)
 */
export const MOVENET_INPUT_SIZE = 256;

/**
 * COCO keypoint indices MoveNet emits as [y, x, score] triples.
 * Aligned with {@link PoseLandmarkIndex} names we already count on.
 */
export const MOVENET_KEYPOINT = {
  nose: 0,
  leftEye: 1,
  rightEye: 2,
  leftEar: 3,
  rightEar: 4,
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

export type MapMoveNetOptions = {
  orientation?: Orientation;
  /** When true, the RGB tensor was already rotated upright before inference. */
  preRotated?: boolean;
  bufferWidth?: number;
  bufferHeight?: number;
};

/**
 * Map a flat MoveNet output (length 17×3, [y,x,score] rows) into a PoseFrame.
 * x/y are normalized to [0,1] of the square model input (upright).
 */
export function mapMoveNetOutput(
  output: ArrayLike<number>,
  timestampMs: number,
  orientationOrOptions:
    | Orientation
    | MapMoveNetOptions = 'portrait',
): import('./landmarks').PoseFrame {
  const options: MapMoveNetOptions =
    typeof orientationOrOptions === 'string'
      ? { orientation: orientationOrOptions }
      : orientationOrOptions;

  const orientation = options.orientation ?? 'portrait';
  const preRotated = options.preRotated === true;
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

    const upright = preRotated
      ? { x, y }
      : uprightNormalizedPoint(x, y, orientation);

    points[name] = {
      x: upright.x,
      y: upright.y,
      score: score ?? 0,
    };
  }

  return {
    timestampMs,
    points,
    bufferWidth: options.bufferWidth,
    bufferHeight: options.bufferHeight,
    orientation,
  };
}
