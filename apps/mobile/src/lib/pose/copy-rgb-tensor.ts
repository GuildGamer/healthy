import { MOVENET_INPUT_SIZE } from './movenet';

/** MoveNet Thunder expects 256×256 RGB uint8 (3 bytes per pixel). */
export const MOVENET_RGB_BYTE_LENGTH =
  MOVENET_INPUT_SIZE * MOVENET_INPUT_SIZE * 3;

/**
 * Pack resize-plugin output for runOnJS.
 * ArrayBuffers and TypedArrays cannot cross the worklet boundary.
 */
export function packMoveNetInputForBridge(source: Uint8Array): number[] {
  'worklet';

  if (source.byteLength !== MOVENET_RGB_BYTE_LENGTH) {
    throw new Error(
      `MoveNet input must be ${MOVENET_RGB_BYTE_LENGTH} bytes, got ${source.byteLength}`,
    );
  }

  const packed: number[] = [];
  for (let index = 0; index < MOVENET_RGB_BYTE_LENGTH; index += 1) {
    packed.push(source[index]!);
  }

  return packed;
}

/**
 * Copy resize-plugin output into a standalone buffer for TFLite.
 * Worklets often lack reliable `ArrayBuffer.prototype.slice`.
 */
export function copyMoveNetInputTensor(source: Uint8Array): Uint8Array {
  'worklet';

  if (source.byteLength !== MOVENET_RGB_BYTE_LENGTH) {
    throw new Error(
      `MoveNet input must be ${MOVENET_RGB_BYTE_LENGTH} bytes, got ${source.byteLength}`,
    );
  }

  const copy = new Uint8Array(MOVENET_RGB_BYTE_LENGTH);
  for (let index = 0; index < MOVENET_RGB_BYTE_LENGTH; index += 1) {
    copy[index] = source[index]!;
  }

  return copy;
}
