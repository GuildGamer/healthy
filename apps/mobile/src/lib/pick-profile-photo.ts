import * as ImagePicker from 'expo-image-picker';
import { isPhysicalDevice } from './is-physical-device';

export const PHOTO_PERMISSION_MESSAGE =
  'Allow photos so you can set a profile picture.';
export const CAMERA_PERMISSION_MESSAGE =
  'Allow the camera so you can take a profile picture.';
export const SIMULATOR_CAMERA_MESSAGE =
  'The camera only works on a physical phone.';
export const PHOTO_MISSING_MESSAGE =
  'We could not keep that photo. Choose another and try again.';
export const PHOTO_TOO_LARGE_MESSAGE =
  'That photo is too large. Crop closer or pick a smaller one.';
export const PHOTO_PICK_FAILED_MESSAGE =
  'We could not open your photos. Check permissions and try again.';
export const PHOTO_SAVE_FAILED_MESSAGE =
  'We could not save that photo. Try again.';

/** Keeps the Better Auth user row and session payload small. */
export const MAX_PROFILE_PHOTO_BASE64_LENGTH = 120_000;

export type ProfilePhotoSource = 'library' | 'camera';

export type ProfilePhotoPick =
  | { status: 'picked'; image: string }
  | { status: 'canceled' }
  | { status: 'failed'; message: string };

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.45,
  base64: true,
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
      return resultFromPicker(result);
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return { status: 'failed', message: PHOTO_PERMISSION_MESSAGE };
    }

    const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    return resultFromPicker(result);
  } catch {
    return { status: 'failed', message: PHOTO_PICK_FAILED_MESSAGE };
  }
}

function resultFromPicker(
  result: ImagePicker.ImagePickerResult,
): ProfilePhotoPick {
  if (result.canceled) {
    return { status: 'canceled' };
  }

  const asset = result.assets[0];
  if (!asset) {
    return { status: 'failed', message: PHOTO_MISSING_MESSAGE };
  }

  return profilePhotoFromAsset(asset);
}
