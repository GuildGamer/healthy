import type { Orientation } from 'react-native-vision-camera';

/**
 * Map a MoveNet point from sensor-buffer space into upright preview space.
 *
 * Vision Camera previews are upright; frame processors often see a sideways
 * buffer. Without this, the skeleton tracks motion but appears rotated 90°
 * (e.g. head toward the side of the screen).
 *
 * Transforms match Vision Camera’s Skia upright counter-rotation for the same
 * `Frame.orientation` values (not the docs’ +90/−90 wording alone — that left
 * the stick figure upside-down on device).
 */
export function uprightNormalizedPoint(
  x: number,
  y: number,
  orientation: Orientation,
): { x: number; y: number } {
  switch (orientation) {
    case 'landscape-left':
      // Skia: rotate buffer 270° CW to upright.
      return { x: y, y: 1 - x };
    case 'landscape-right':
      // Skia: rotate buffer 90° CW to upright.
      return { x: 1 - y, y: x };
    case 'portrait-upside-down':
      return { x: 1 - x, y: 1 - y };
    case 'portrait':
    default:
      return { x, y };
  }
}

export function isFrameOrientation(value: string): value is Orientation {
  return (
    value === 'portrait' ||
    value === 'landscape-left' ||
    value === 'landscape-right' ||
    value === 'portrait-upside-down'
  );
}
