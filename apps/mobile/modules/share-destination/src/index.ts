import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

export type InstagramStoriesShareInput = {
  /** Meta / Facebook App ID required by Instagram since 2023. */
  appId: string;
  /** Local `file://` image for the Stories background. */
  backgroundImageUri?: string | null;
  /** Local `file://` video for the Stories background (≤20s). */
  backgroundVideoUri?: string | null;
};

export type WhatsAppShareInput = {
  fileUri: string;
  mimeType: string;
  /** Caption when sharing into a chat (Android Intent EXTRA_TEXT). */
  caption?: string | null;
};

type ShareDestinationNative = {
  shareToInstagramStories: (input: InstagramStoriesShareInput) => Promise<boolean>;
  shareToWhatsApp: (input: WhatsAppShareInput) => Promise<boolean>;
};

function loadNative(): ShareDestinationNative | null {
  return requireOptionalNativeModule<ShareDestinationNative>('ShareDestination');
}

/**
 * Opens Instagram Stories with the given background asset.
 * Returns false when the module is missing, Instagram is absent, or inputs are invalid.
 */
export async function shareToInstagramStories(
  input: InstagramStoriesShareInput,
): Promise<boolean> {
  const appId = input.appId.trim();
  if (appId.length === 0) {
    return false;
  }
  if (!input.backgroundImageUri && !input.backgroundVideoUri) {
    return false;
  }

  const native = loadNative();
  if (!native) {
    return false;
  }

  try {
    return await native.shareToInstagramStories({
      appId,
      backgroundImageUri: input.backgroundImageUri ?? null,
      backgroundVideoUri: input.backgroundVideoUri ?? null,
    });
  } catch {
    return false;
  }
}

/**
 * Opens WhatsApp with a media attachment (chat picker; Status is offered there).
 * On iOS this returns false — use the system share sheet instead.
 */
export async function shareToWhatsApp(input: WhatsAppShareInput): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }
  if (!input.fileUri.trim()) {
    return false;
  }

  const native = loadNative();
  if (!native) {
    return false;
  }

  try {
    return await native.shareToWhatsApp({
      fileUri: input.fileUri,
      mimeType: input.mimeType,
      caption: input.caption ?? null,
    });
  } catch {
    return false;
  }
}
