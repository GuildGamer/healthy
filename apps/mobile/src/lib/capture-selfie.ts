import * as ImagePicker from 'expo-image-picker';
import type { ChallengeEvidence } from '@product/client';
import { isPhysicalDevice } from './is-physical-device';

export const CAMERA_FAILED_MESSAGE =
  'We could not open the camera. Check permissions and try again.';
export const SIMULATOR_CAMERA_MESSAGE =
  'The camera only works on a physical phone.';
export const PHOTO_MISSING_MESSAGE =
  'We could not keep that photo. Take another and try again.';

export type CapturedSelfie = ChallengeEvidence & { previewUri: string };

export type CaptureSelfieResult =
  | { status: 'captured'; photo: CapturedSelfie }
  | { status: 'canceled' }
  | { status: 'failed'; message: string };

function mimeTypeFor(asset: ImagePicker.ImagePickerAsset): ChallengeEvidence['mimeType'] {
  if (asset.mimeType === 'image/png') {
    return 'image/png';
  }

  return 'image/jpeg';
}

export async function captureSelfie(): Promise<CaptureSelfieResult> {
  if (!isPhysicalDevice()) {
    return { status: 'failed', message: SIMULATOR_CAMERA_MESSAGE };
  }

  try {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      return { status: 'failed', message: CAMERA_FAILED_MESSAGE };
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.6,
      base64: true,
    });

    if (result.canceled) {
      return { status: 'canceled' };
    }

    const asset = result.assets[0];
    if (!asset?.base64 || !asset.uri) {
      return { status: 'failed', message: PHOTO_MISSING_MESSAGE };
    }

    return {
      status: 'captured',
      photo: {
        mimeType: mimeTypeFor(asset),
        imageBase64: asset.base64,
        previewUri: asset.uri,
      },
    };
  } catch {
    return { status: 'failed', message: CAMERA_FAILED_MESSAGE };
  }
}
