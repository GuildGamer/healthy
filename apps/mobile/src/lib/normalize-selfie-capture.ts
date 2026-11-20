import { FlipType, ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import {
  EVIDENCE_CAMERA_QUALITY,
  PHOTO_MISSING_MESSAGE,
  type CaptureSelfieResult,
  photoFromCameraTake,
} from './capture-selfie';

export type CameraTakeForNormalize = {
  uri: string;
  base64?: string | null;
  width?: number;
  height?: number;
  exif?: Record<string, unknown> | null;
};

/**
 * EXIF Orientation → clockwise degrees to bake into pixels.
 * 1 / missing = upright already.
 */
export function degreesFromExifOrientation(orientation: unknown): number {
  const value =
    typeof orientation === 'number'
      ? orientation
      : typeof orientation === 'string'
        ? Number(orientation)
        : NaN;

  switch (value) {
    case 3:
      return 180;
    case 6:
      return 90;
    case 8:
      return 270;
    default:
      return 0;
  }
}

export function shouldNormalizeCameraTake(input: {
  facing: 'front' | 'back';
  exif?: Record<string, unknown> | null;
}): boolean {
  if (input.facing === 'front') {
    return true;
  }

  return degreesFromExifOrientation(input.exif?.Orientation) !== 0;
}

/**
 * After shutter: bake EXIF rotation into pixels, and for front-camera selfies
 * flip horizontally so the saved photo matches the mirrored live preview
 * (iPhone Camera default). Do not transform the live CameraView instead.
 */
export async function normalizeSelfieCapture(
  take: CameraTakeForNormalize,
  options: { facing: 'front' | 'back'; compress?: number },
): Promise<CaptureSelfieResult> {
  const rotateDegrees = degreesFromExifOrientation(take.exif?.Orientation);
  const mirrorHorizontal = options.facing === 'front';

  if (!mirrorHorizontal && rotateDegrees === 0) {
    return photoFromCameraTake(take);
  }

  const compress = options.compress ?? EVIDENCE_CAMERA_QUALITY;
  let context = ImageManipulator.manipulate(take.uri);

  try {
    if (rotateDegrees !== 0) {
      context = context.rotate(rotateDegrees);
    }
    if (mirrorHorizontal) {
      context = context.flip(FlipType.Horizontal);
    }

    const image = await context.renderAsync();
    try {
      const saved = await image.saveAsync({
        base64: true,
        compress,
        format: SaveFormat.JPEG,
      });

      const size = uprightSize(take.width, take.height, rotateDegrees);
      return photoFromCameraTake({
        uri: saved.uri,
        base64: saved.base64,
        ...size,
      });
    } finally {
      releaseNative(image);
    }
  } catch {
    return { status: 'failed', message: PHOTO_MISSING_MESSAGE };
  } finally {
    releaseNative(context);
  }
}

export function uprightSize(
  width: number | undefined,
  height: number | undefined,
  rotateDegrees: number,
): { width?: number; height?: number } {
  if (typeof width !== 'number' || typeof height !== 'number') {
    return {};
  }

  if (rotateDegrees === 90 || rotateDegrees === 270) {
    return { width: height, height: width };
  }

  return { width, height };
}

function releaseNative(resource: object): void {
  const release = Reflect.get(resource, 'release');
  if (typeof release !== 'function') {
    return;
  }

  release.call(resource);
}
