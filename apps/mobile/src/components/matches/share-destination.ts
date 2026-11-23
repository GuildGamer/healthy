import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { Linking, Platform } from 'react-native';
import {
  shareToInstagramStories,
  shareToWhatsApp,
} from 'share-destination';
import { shareWithTracking } from '@/lib/analytics';
import { FACEBOOK_APP_ID } from '@/lib/config';

export type ShareDestinationId =
  | 'whatsapp'
  | 'status'
  | 'instagram'
  | 'x'
  | 'messages'
  | 'copy'
  | 'overflow';

export type ShareArtifact =
  | {
      kind: 'video';
      /** Full proof clip on disk. */
      clipUri: string;
      /** Short social cut when present; Status / Instagram prefer it. */
      socialClipUri?: string | null;
    }
  | {
      kind: 'image';
      /** Deck poster PNG on disk. */
      posterUri: string;
    }
  | {
      kind: 'link';
    };

export type SharePayload = {
  /** Caption line plus optional invite URL. */
  caption: string;
  inviteUrl?: string | null;
  /** What leaves the phone for this tap. Screens pick; destinations do not guess. */
  artifact: ShareArtifact;
};

/**
 * Opens a named destination with the artifact on screen.
 * Video and image attach the file. Link opens text deep links. A caption may
 * ride with a file; it never replaces the file.
 */
export async function openShareDestination(
  destination: ShareDestinationId,
  payload: SharePayload,
): Promise<void> {
  const caption = buildCaption(payload);

  if (destination === 'copy') {
    await Clipboard.setStringAsync(payload.inviteUrl?.trim() || caption);
    return;
  }

  if (payload.artifact.kind === 'link') {
    await openLinkDestination(destination, caption);
    return;
  }

  if (payload.artifact.kind === 'image') {
    await openFileDestination({
      destination,
      fileUri: payload.artifact.posterUri,
      mimeType: 'image/png',
      caption,
      imageUri: payload.artifact.posterUri,
    });
    return;
  }

  const socialUri = payload.artifact.socialClipUri?.trim() || null;
  const fullUri = payload.artifact.clipUri;
  const useSocial =
    (destination === 'status' || destination === 'instagram') && Boolean(socialUri);
  const fileUri = useSocial && socialUri ? socialUri : fullUri;

  await openFileDestination({
    destination,
    fileUri,
    mimeType: 'video/mp4',
    caption,
    videoUri: fileUri,
  });
}

function buildCaption(payload: SharePayload): string {
  const base = payload.caption.trim();
  const url = payload.inviteUrl?.trim();
  if (!url) {
    return base;
  }
  if (base.includes(url)) {
    return base;
  }
  if (base.length === 0) {
    return url;
  }
  return `${base}\n${url}`;
}

async function openLinkDestination(
  destination: Exclude<ShareDestinationId, 'copy'>,
  caption: string,
): Promise<void> {
  switch (destination) {
    case 'whatsapp':
      await openWhatsAppText(caption);
      return;
    case 'messages':
      await openMessagesText(caption);
      return;
    case 'x':
      await openXText(caption);
      return;
    case 'status':
    case 'instagram':
    case 'overflow':
      await shareWithTracking(`proof_${destination}`, textShareContent(caption));
      return;
  }
}

async function openFileDestination(input: {
  destination: Exclude<ShareDestinationId, 'copy'>;
  fileUri: string;
  mimeType: 'image/png' | 'video/mp4';
  caption: string;
  imageUri?: string;
  videoUri?: string;
}): Promise<void> {
  const { destination, fileUri, mimeType, caption, imageUri, videoUri } = input;

  if (destination === 'instagram') {
    if (await tryInstagramStories({ imageUri, videoUri })) {
      return;
    }
  }

  if (
    (destination === 'whatsapp' || destination === 'status') &&
    Platform.OS === 'android'
  ) {
    const opened = await shareToWhatsApp({
      fileUri,
      mimeType,
      caption,
    });
    if (opened) {
      return;
    }
  }

  await shareFile({
    fileUri,
    caption,
    mimeType,
  });
}

async function openWhatsAppText(caption: string): Promise<void> {
  const url = `whatsapp://send?text=${encodeURIComponent(caption)}`;
  if (await canOpen(url)) {
    await Linking.openURL(url);
    return;
  }
  await shareWithTracking('proof_whatsapp', textShareContent(caption));
}

async function openMessagesText(caption: string): Promise<void> {
  const url =
    Platform.OS === 'ios'
      ? `sms:&body=${encodeURIComponent(caption)}`
      : `sms:?body=${encodeURIComponent(caption)}`;
  if (await canOpen(url)) {
    await Linking.openURL(url);
    return;
  }
  await shareWithTracking('proof_messages', textShareContent(caption));
}

async function openXText(caption: string): Promise<void> {
  const appUrl = `twitter://post?message=${encodeURIComponent(caption)}`;
  if (await canOpen(appUrl)) {
    await Linking.openURL(appUrl);
    return;
  }

  const webUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(caption)}`;
  if (await canOpen(webUrl)) {
    await Linking.openURL(webUrl);
    return;
  }

  await shareWithTracking('proof_x', textShareContent(caption));
}

/**
 * Instagram Stories via Meta's pasteboard / ADD_TO_STORY handoff.
 * Requires `EXPO_PUBLIC_FACEBOOK_APP_ID` and a native rebuild that includes
 * the `share-destination` module.
 */
async function tryInstagramStories(input: {
  imageUri?: string | null;
  videoUri?: string | null;
}): Promise<boolean> {
  if (!FACEBOOK_APP_ID) {
    return false;
  }

  if (input.imageUri) {
    const opened = await shareToInstagramStories({
      appId: FACEBOOK_APP_ID,
      backgroundImageUri: input.imageUri,
    });
    if (opened) {
      return true;
    }
  }

  if (input.videoUri) {
    return shareToInstagramStories({
      appId: FACEBOOK_APP_ID,
      backgroundVideoUri: input.videoUri,
    });
  }

  return false;
}

async function canOpen(url: string): Promise<boolean> {
  try {
    return await Linking.canOpenURL(url);
  } catch {
    return false;
  }
}

function textShareContent(caption: string): { message: string } | { message: string; url: string } {
  if (Platform.OS !== 'ios') {
    return { message: caption };
  }

  const urlMatch = caption.match(/https?:\/\/\S+/);
  if (!urlMatch) {
    return { message: caption };
  }

  const inviteUrl = urlMatch[0];
  const text = caption.split(inviteUrl).join('').trim();
  if (text.length === 0) {
    return { message: caption, url: inviteUrl };
  }
  return { message: text, url: inviteUrl };
}

async function shareFile(input: {
  fileUri: string;
  caption: string;
  mimeType: 'image/png' | 'video/mp4';
}): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    return;
  }

  await Sharing.shareAsync(input.fileUri, {
    mimeType: input.mimeType,
    UTI: input.mimeType === 'image/png' ? 'public.png' : 'public.mpeg-4',
    dialogTitle: input.caption.slice(0, 80) || undefined,
  });
}
