import type { CameraType, CameraView } from 'expo-camera';
import { type RefObject, useState } from 'react';
import {
  CAMERA_FAILED_MESSAGE,
  type CaptureSelfieResult,
  EVIDENCE_CAMERA_QUALITY,
  PHOTO_MISSING_MESSAGE,
  photoFromCameraTake,
} from '@/lib/capture-selfie';
import {
  normalizeSelfieCapture,
  shouldNormalizeCameraTake,
} from '@/lib/normalize-selfie-capture';

export type TakePhotoOptions = {
  /** Front selfies are mirrored after capture to match the live preview. */
  facing?: CameraType;
};

/** One press of the shutter, sized for the photo check and kept off the shutter sound. */
export function useTakePhoto(cameraRef: RefObject<CameraView | null>) {
  const [isCapturing, setIsCapturing] = useState(false);

  async function takePhoto(options: TakePhotoOptions = {}): Promise<CaptureSelfieResult> {
    if (isCapturing) {
      return { status: 'canceled' };
    }

    const facing = options.facing ?? 'back';
    setIsCapturing(true);
    try {
      const taken = await cameraRef.current?.takePictureAsync({
        base64: true,
        quality: EVIDENCE_CAMERA_QUALITY,
        shutterSound: false,
        // Needed so we can bake any remaining EXIF orientation into pixels after capture.
        exif: true,
      });

      if (!taken) {
        return { status: 'failed', message: PHOTO_MISSING_MESSAGE };
      }

      const exif =
        taken.exif && typeof taken.exif === 'object'
          ? (taken.exif as Record<string, unknown>)
          : null;

      if (
        shouldNormalizeCameraTake({
          facing,
          exif,
        })
      ) {
        return normalizeSelfieCapture(
          {
            uri: taken.uri,
            base64: taken.base64,
            width: taken.width,
            height: taken.height,
            exif,
          },
          { facing, compress: EVIDENCE_CAMERA_QUALITY },
        );
      }

      return photoFromCameraTake(taken);
    } catch {
      return { status: 'failed', message: CAMERA_FAILED_MESSAGE };
    } finally {
      setIsCapturing(false);
    }
  }

  return { takePhoto, isCapturing };
}
