import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/**
 * Longest edge of the avatar we store. The photo lives on the user row and
 * comes back with every session, so it has to be a small face, not the camera
 * original. 384px covers the 88pt avatar on a 3x screen.
 */
export const PROFILE_PHOTO_EDGE_PX = 384;

export function avatarResize(
  width: number | undefined,
  height: number | undefined,
  edge: number,
): { width: number } | { height: number } {
  if (typeof width === 'number' && typeof height === 'number' && width > 0 && height > width) {
    return { height: edge };
  }

  return { width: edge };
}

export async function renderProfilePhoto(input: {
  uri: string;
  width?: number;
  height?: number;
  edge: number;
  compress: number;
}): Promise<{ base64?: string | null }> {
  const context = ImageManipulator.manipulate(input.uri).resize(
    avatarResize(input.width, input.height, input.edge),
  );

  try {
    const image = await context.renderAsync();
    try {
      return await image.saveAsync({
        base64: true,
        compress: input.compress,
        format: SaveFormat.JPEG,
      });
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
