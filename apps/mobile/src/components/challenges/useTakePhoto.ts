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
 * One press of the shutter at share-grade JPEG quality, kept off the shutter
 * sound. Uses Expo's processed JPEG as-is for preview/share; upload bytes may
 * be recompressed when the API body would overflow. The front CameraView
 * mirror prop keeps that JPEG in the viewfinder's left-right orientation.
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

      return await photoFromCameraTake(taken);
    } catch {
      return { status: 'failed', message: CAMERA_FAILED_MESSAGE };
    } finally {
      setIsCapturing(false);
    }
  }

  return { takePhoto, isCapturing };
}
