/**
 * Bundled MoveNet SinglePose Lightning (int8).
 *
 * Input: 1×192×192×3 uint8 RGB
 * Output: 1×1×17×3 float32 — keypoints as [y, x, score]
 */
export {
  mapMoveNetOutput,
  MOVENET_INPUT_SIZE,
  MOVENET_KEYPOINT,
} from './movenet';

// Metro must list `tflite` in assetExts (see metro.config.js).
export const MOVENET_MODEL = require('../../../assets/models/movenet-lightning.tflite');
