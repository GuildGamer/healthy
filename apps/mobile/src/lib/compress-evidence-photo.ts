import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { MAX_EVIDENCE_PHOTO_BASE64_LENGTH } from './capture-selfie';

/** Longest edge when the full JPEG base64 will not fit the API body. */
export const EVIDENCE_UPLOAD_MAX_EDGE_PX = 1280;

/** JPEG compress steps tried after resize, hardest first. */
const UPLOAD_COMPRESS_STEPS = [0.72, 0.55, 0.4] as const;

/**
 * Shrinks a camera JPEG until its base64 fits the evidence upload limit.
 * The original `previewUri` stays untouched for in-app share.
 */
export async function compressEvidencePhotoForUpload(uri: string): Promise<string | null> {
  for (const compress of UPLOAD_COMPRESS_STEPS) {
    const base64 = await renderUploadJpeg(uri, compress);
    if (base64 && base64.length <= MAX_EVIDENCE_PHOTO_BASE64_LENGTH) {
      return base64;
    }
  }
  return null;
}

async function renderUploadJpeg(uri: string, compress: number): Promise<string | null> {
  const context = ImageManipulator.manipulate(uri).resize({
    width: EVIDENCE_UPLOAD_MAX_EDGE_PX,
  });

  try {
    const image = await context.renderAsync();
    try {
      const saved = await image.saveAsync({
        base64: true,
        compress,
        format: SaveFormat.JPEG,
      });
      return saved.base64 ?? null;
    } finally {
      releaseNative(image);
    }
  } finally {
    releaseNative(context);
  }
}

function releaseNative(resource: object): void {
  const release = Reflect.get(resource, 'release');
  if (typeof release !== 'function') {
    return;
  }

  release.call(resource);
}
