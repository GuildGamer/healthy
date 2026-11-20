import type { CameraView } from 'expo-camera';
import { type RefObject, useState } from 'react';
import {
  CAMERA_FAILED_MESSAGE,
  type CaptureSelfieResult,
  EVIDENCE_CAMERA_QUALITY,
  PHOTO_MISSING_MESSAGE,
  photoFromCameraTake,
} from '@/lib/capture-selfie';

/**
 * One press of the shutter, sized for the photo check and kept off the shutter
 * sound. Uses Expo's processed JPEG as-is (upright, unmirrored like stock
 * iPhone Camera) — no post-capture flip or EXIF re-bake.
 */
export function useTakePhoto(cameraRef: RefObject<CameraView | null>) {
  const [isCapturing, setIsCapturing] = useState(false);

  async function takePhoto(): Promise<CaptureSelfieResult> {
    if (isCapturing) {
      return { status: 'canceled' };
    }

    setIsCapturing(true);
    try {
      const taken = await cameraRef.current?.takePictureAsync({
        base64: true,
        quality: EVIDENCE_CAMERA_QUALITY,
        shutterSound: false,
      });

      if (!taken) {
        return { status: 'failed', message: PHOTO_MISSING_MESSAGE };
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
