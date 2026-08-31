import type { ChallengeEvidence } from '@product/client';

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

export function photoFromCameraTake(result: {
  uri: string;
  base64?: string | null;
}): CaptureSelfieResult {
  if (!result.base64) {
    return { status: 'failed', message: PHOTO_MISSING_MESSAGE };
  }

  return {
    status: 'captured',
    photo: {
      mimeType: 'image/jpeg',
      imageBase64: result.base64,
      previewUri: result.uri,
    },
  };
}
