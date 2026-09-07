import type { Orientation } from 'react-native-vision-camera';

/**
 * Vision Camera buffer → upright size after the same counter-rotation Skia uses
 * for the preview (`Frame.orientation`).
 */
export function uprightBufferSize(
  bufferWidth: number,
  bufferHeight: number,
  orientation: Orientation,
): { width: number; height: number } {
  if (
    orientation === 'landscape-left' ||
    orientation === 'landscape-right'
  ) {
    return { width: bufferHeight, height: bufferWidth };
  }

  return { width: bufferWidth, height: bufferHeight };
}

/**
 * Rotate the center-cropped square so MoveNet sees an upright person.
 * Applied after crop+scale in vision-camera-resize-plugin (crop → scale → rotate).
 *
 * Degrees match {@link uprightNormalizedPoint} / Skia preview counter-rotation.
 */
export function resizeRotationForOrientation(
  orientation: Orientation,
): '0deg' | '90deg' | '180deg' | '270deg' {
  switch (orientation) {
    case 'landscape-left':
      return '270deg';
    case 'landscape-right':
      return '90deg';
    case 'portrait-upside-down':
      return '180deg';
    case 'portrait':
    default:
      return '0deg';
  }
}

type CoverMapArgs = {
  viewWidth: number;
  viewHeight: number;
  bufferWidth: number;
  bufferHeight: number;
  orientation: Orientation;
};

/**
 * Map a MoveNet point from the upright center-square crop into the Camera
 * preview when `resizeMode="cover"`.
 *
 * Without this, full-screen cover crops differently than the square model
 * input, so bones look stretched (e.g. arms longer than the hands).
 *
 * Returns normalized coordinates in view space [0, 1].
 */
export function mapSquareModelPointToCoverView(
  modelX: number,
  modelY: number,
  args: CoverMapArgs,
): { x: number; y: number } {
  const { viewWidth, viewHeight, bufferWidth, bufferHeight, orientation } =
    args;

  if (
    viewWidth <= 0 ||
    viewHeight <= 0 ||
    bufferWidth <= 0 ||
    bufferHeight <= 0
  ) {
    return { x: modelX, y: modelY };
  }

  const upright = uprightBufferSize(bufferWidth, bufferHeight, orientation);
  const squareSide = Math.min(upright.width, upright.height);
  const squareOffsetX = (upright.width - squareSide) / 2;
  const squareOffsetY = (upright.height - squareSide) / 2;

  const uprightX = squareOffsetX + modelX * squareSide;
  const uprightY = squareOffsetY + modelY * squareSide;

  const coverScale = Math.max(
    viewWidth / upright.width,
    viewHeight / upright.height,
  );
  const displayedWidth = upright.width * coverScale;
  const displayedHeight = upright.height * coverScale;
  const offsetX = (viewWidth - displayedWidth) / 2;
  const offsetY = (viewHeight - displayedHeight) / 2;

  return {
    x: (uprightX * coverScale + offsetX) / viewWidth,
    y: (uprightY * coverScale + offsetY) / viewHeight,
  };
}
