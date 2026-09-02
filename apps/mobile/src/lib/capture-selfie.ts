import type { ChallengeEvidence } from '@product/client';

export const CAMERA_FAILED_MESSAGE =
  'We could not open the camera. Check permissions and try again.';
export const SIMULATOR_CAMERA_MESSAGE =
  'The camera only works on a physical phone.';
export const PHOTO_MISSING_MESSAGE =
  'We could not keep that photo. Take another and try again.';
export const PHOTO_TOO_LARGE_MESSAGE =
  'That photo is too large to upload. Move closer and try again.';

/**
 * JPEG quality for gym / proof captures. High enough for vision checks,
 * low enough to stay under the API JSON body limit on modern phone cameras.
 */
export const EVIDENCE_CAMERA_QUALITY = 0.35;

/**
 * Soft cap under the contract max (2_000_000) so the JSON envelope still fits
 * in the API’s 3mb body parser limit.
 */
export const MAX_EVIDENCE_PHOTO_BASE64_LENGTH = 1_500_000;

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

  if (result.base64.length > MAX_EVIDENCE_PHOTO_BASE64_LENGTH) {
    return { status: 'failed', message: PHOTO_TOO_LARGE_MESSAGE };
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
