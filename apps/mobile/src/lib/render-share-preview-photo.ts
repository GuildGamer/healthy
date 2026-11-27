import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/**
 * Longest edge for the in-app share preview. Exports are 1080 wide; this stays
 * above that so crops stay sharp, while decoding far less than a full camera JPEG.
 */
export const SHARE_PREVIEW_MAX_EDGE_PX = 1440;

/** JPEG quality for the preview file — sharp enough on screen, quick to decode. */
const SHARE_PREVIEW_JPEG_QUALITY = 0.85;

/**
 * Writes a smaller JPEG next to the camera take for the share card preview.
 * Returns null when resize fails; callers keep the original URI then.
 */
export async function renderSharePreviewPhoto(
  uri: string,
  size?: { width?: number; height?: number },
): Promise<string | null> {
  const resize = previewResize(size?.width, size?.height);
  if (!resize) {
    return uri;
  }

  const context = ImageManipulator.manipulate(uri).resize(resize);

  try {
    const image = await context.renderAsync();
    try {
      const saved = await image.saveAsync({
        compress: SHARE_PREVIEW_JPEG_QUALITY,
        format: SaveFormat.JPEG,
      });
      return saved.uri ?? null;
    } finally {
      releaseNative(image);
    }
  } catch {
    return null;
  } finally {
    releaseNative(context);
  }
}

function previewResize(
  width: number | undefined,
  height: number | undefined,
): { width: number } | { height: number } | null {
  if (!width || !height || width <= 0 || height <= 0) {
    return { width: SHARE_PREVIEW_MAX_EDGE_PX };
  }

  const longEdge = Math.max(width, height);
  if (longEdge <= SHARE_PREVIEW_MAX_EDGE_PX) {
    return null;
  }

  return width >= height
    ? { width: SHARE_PREVIEW_MAX_EDGE_PX }
    : { height: SHARE_PREVIEW_MAX_EDGE_PX };
}

function releaseNative(resource: object): void {
  const release = Reflect.get(resource, 'release');
  if (typeof release !== 'function') {
    return;
  }

  release.call(resource);
}
