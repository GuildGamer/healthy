import type { CameraView } from 'expo-camera';
import { type RefObject, useState } from 'react';
import {
  CAMERA_FAILED_MESSAGE,
  type CaptureSelfieResult,
  EVIDENCE_CAMERA_QUALITY,
  PHOTO_MISSING_MESSAGE,
  photoFromCameraTake,
} from '@/lib/capture-selfie';

/** One press of the shutter, sized for the photo check and kept off the shutter sound. */
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
        exif: false,
      });

      return taken
        ? photoFromCameraTake(taken)
        : { status: 'failed', message: PHOTO_MISSING_MESSAGE };
    } catch {
      return { status: 'failed', message: CAMERA_FAILED_MESSAGE };
    } finally {
      setIsCapturing(false);
    }
  }

  return { takePhoto, isCapturing };
}
