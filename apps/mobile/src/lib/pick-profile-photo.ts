import * as ImagePicker from 'expo-image-picker';
import { isPhysicalDevice } from './is-physical-device';
import {
  PROFILE_PHOTO_EDGE_PX,
  renderProfilePhoto,
} from './render-profile-photo';

export const PHOTO_PERMISSION_MESSAGE =
  'Allow photos so you can set a profile picture.';
export const CAMERA_PERMISSION_MESSAGE =
  'Allow the camera so you can take a profile picture.';
export const SIMULATOR_CAMERA_MESSAGE =
  'The camera only works on a physical phone.';
export const PHOTO_MISSING_MESSAGE =
  'We could not keep that photo. Choose another and try again.';
export const PHOTO_TOO_LARGE_MESSAGE =
  'That photo is too large to save. Try a different one.';
export const PHOTO_PICK_FAILED_MESSAGE =
  'We could not open your photos. Check permissions and try again.';
export const PHOTO_SAVE_FAILED_MESSAGE =
  'We could not save that photo. Try again.';

/**
 * Backstop after the avatar resize. The saved JPEG is a data URL on the user
 * row, and that row is returned with the session.
 */
export const MAX_PROFILE_PHOTO_BASE64_LENGTH = 120_000;

/**
 * First pass is the display size. The second is only for a photo that is
 * still over the session cap after that.
 */
const PROFILE_PHOTO_RENDER_PASSES = [
  { edge: PROFILE_PHOTO_EDGE_PX, compress: 0.7 },
  { edge: 256, compress: 0.5 },
] as const;

export type ProfilePhotoSource = 'library' | 'camera';

export type ProfilePhotoPick =
  | { status: 'picked'; image: string }
  | { status: 'canceled' }
  | { status: 'failed'; message: string };

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.9,
  cameraType: ImagePicker.CameraType.front,
};

export function profilePhotoFromAsset(asset: {
  base64?: string | null;
  mimeType?: string | null;
}): ProfilePhotoPick {
  if (!asset.base64) {
    return { status: 'failed', message: PHOTO_MISSING_MESSAGE };
  }

  if (asset.base64.length > MAX_PROFILE_PHOTO_BASE64_LENGTH) {
    return { status: 'failed', message: PHOTO_TOO_LARGE_MESSAGE };
  }

  const mimeType = asset.mimeType?.includes('png') ? 'image/png' : 'image/jpeg';

  return {
    status: 'picked',
    image: `data:${mimeType};base64,${asset.base64}`,
  };
}

export type ProfilePhotoRenderer = (input: {
  uri: string;
  width?: number;
  height?: number;
  edge: number;
  compress: number;
}) => Promise<{ base64?: string | null }>;

/**
 * Shrink a picked file to an avatar JPEG, then give up only if that still
 * will not fit on the user row.
 */
export async function profilePhotoFromCapture(
  asset: { uri?: string | null; width?: number; height?: number },
  render: ProfilePhotoRenderer,
): Promise<ProfilePhotoPick> {
  const uri = asset.uri?.trim() ?? '';
  if (!uri) {
    return { status: 'failed', message: PHOTO_MISSING_MESSAGE };
  }

  let last: ProfilePhotoPick = {
    status: 'failed',
    message: PHOTO_TOO_LARGE_MESSAGE,
  };

  for (const pass of PROFILE_PHOTO_RENDER_PASSES) {
    let rendered: { base64?: string | null };
    try {
      rendered = await render({
        uri,
        width: asset.width,
        height: asset.height,
        edge: pass.edge,
        compress: pass.compress,
      });
    } catch {
      return { status: 'failed', message: PHOTO_MISSING_MESSAGE };
    }

    last = profilePhotoFromAsset({
      base64: rendered.base64,
      mimeType: 'image/jpeg',
    });
    if (last.status === 'picked') {
      return last;
    }
    if (last.status === 'failed' && last.message !== PHOTO_TOO_LARGE_MESSAGE) {
      return last;
    }
  }

  return last;
}

export async function pickProfilePhoto(
  source: ProfilePhotoSource,
): Promise<ProfilePhotoPick> {
  try {
    if (source === 'camera') {
      if (!isPhysicalDevice()) {
        return { status: 'failed', message: SIMULATOR_CAMERA_MESSAGE };
      }

      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        return { status: 'failed', message: CAMERA_PERMISSION_MESSAGE };
      }

      const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
      return await resultFromPicker(result);
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return { status: 'failed', message: PHOTO_PERMISSION_MESSAGE };
    }

    const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    return await resultFromPicker(result);
  } catch {
    return { status: 'failed', message: PHOTO_PICK_FAILED_MESSAGE };
  }
}

async function resultFromPicker(
  result: ImagePicker.ImagePickerResult,
): Promise<ProfilePhotoPick> {
  if (result.canceled) {
    return { status: 'canceled' };
  }

  const asset = result.assets[0];
  if (!asset) {
    return { status: 'failed', message: PHOTO_MISSING_MESSAGE };
  }

  return profilePhotoFromCapture(asset, renderProfilePhoto);
}
