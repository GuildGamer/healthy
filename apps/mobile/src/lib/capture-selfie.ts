import type { ChallengeEvidence } from '@product/client';
import { compressEvidencePhotoForUpload } from './compress-evidence-photo';
import { renderSharePreviewPhoto } from './render-share-preview-photo';

export const CAMERA_FAILED_MESSAGE =
  'We could not open the camera. Check permissions and try again.';
export const SIMULATOR_CAMERA_MESSAGE = 'The camera only works on a physical phone.';
export const PHOTO_MISSING_MESSAGE = 'We could not keep that photo. Take another and try again.';
export const PHOTO_TOO_LARGE_MESSAGE =
  'That photo is too large to upload. Move closer and try again.';

/**
 * JPEG quality for the gym / proof shutter. High enough to look like a normal
 * phone photo on share; upload may recompress separately for the API body.
 */
export const EVIDENCE_CAMERA_QUALITY = 0.9;

/**
 * Soft cap under the contract max (2_000_000) so the JSON envelope still fits
 * in the API’s 3mb body parser limit.
 */
export const MAX_EVIDENCE_PHOTO_BASE64_LENGTH = 1_500_000;

export const DEFAULT_PHOTO_ASPECT_RATIO = 3 / 4;

export type CapturedSelfie = ChallengeEvidence & {
  previewUri: string;
  width?: number;
  height?: number;
};

export function photoAspectRatio(photo: { width?: number; height?: number }): number {
  if (!photo.width || !photo.height || photo.width <= 0 || photo.height <= 0) {
    return DEFAULT_PHOTO_ASPECT_RATIO;
  }

  return photo.width / photo.height;
}

export type CaptureSelfieResult =
  | { status: 'captured'; photo: CapturedSelfie }
  | { status: 'canceled' }
  | { status: 'failed'; message: string };

/**
 * Builds a captured selfie from a shutter take. The share preview is resized
 * so the card does not wait on a full camera JPEG; upload may recompress a
 * smaller JPEG for the API body when base64 would overflow.
 */
export async function photoFromCameraTake(result: {
  uri: string;
  base64?: string | null;
  width?: number;
  height?: number;
}): Promise<CaptureSelfieResult> {
  if (!result.base64) {
    return { status: 'failed', message: PHOTO_MISSING_MESSAGE };
  }

  let imageBase64 = result.base64;
  if (imageBase64.length > MAX_EVIDENCE_PHOTO_BASE64_LENGTH) {
    const compressed = await compressEvidencePhotoForUpload(result.uri);
    if (!compressed) {
      return { status: 'failed', message: PHOTO_TOO_LARGE_MESSAGE };
    }
    imageBase64 = compressed;
  }

  const previewUri =
    (await renderSharePreviewPhoto(result.uri, {
      width: result.width,
      height: result.height,
    })) ?? result.uri;

  return {
    status: 'captured',
    photo: {
      mimeType: 'image/jpeg',
      imageBase64,
      previewUri,
      ...(result.width && result.height ? { width: result.width, height: result.height } : {}),
    },
  };
}
