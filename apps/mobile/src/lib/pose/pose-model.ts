/**
 * Bundled MoveNet SinglePose Thunder (int8).
 *
 * Input: 1×256×256×3 uint8 RGB
 * Output: 1×1×17×3 float32 — keypoints as [y, x, score]
 *
 * Thunder is slower than Lightning but more accurate on elbows/wrists —
 * the main failure mode we saw on front-camera push-ups.
 */
export {
  mapMoveNetOutput,
  MOVENET_INPUT_SIZE,
  MOVENET_KEYPOINT,
} from './movenet';

// Metro must list `tflite` in assetExts (see metro.config.js).
export const MOVENET_MODEL = require('../../../assets/models/movenet-thunder.tflite');
