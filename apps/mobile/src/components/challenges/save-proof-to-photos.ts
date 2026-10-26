import * as MediaLibrary from 'expo-media-library';

/**
 * Saves a local proof video into the camera roll. Requests add-only access.
 * Returns a user-facing error message on failure, or null on success.
 */
export async function saveProofToPhotos(fileUri: string): Promise<string | null> {
  const permission = await MediaLibrary.requestPermissionsAsync(true);
  if (!permission.granted) {
    return 'Photos access is needed to save this clip.';
  }

  try {
    await MediaLibrary.saveToLibraryAsync(fileUri);
    return null;
  } catch {
    return 'Could not save to Photos.';
  }
}
