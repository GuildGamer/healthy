import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';
import { EncodingType, readAsStringAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Linking, Platform } from 'react-native';
import { shareWithTracking } from '@/lib/analytics';

export type ShareDestinationId =
  | 'whatsapp'
  | 'status'
  | 'instagram'
  | 'x'
  | 'messages'
  | 'copy'
  | 'overflow'
  | 'clip';

export type SharePayload = {
  /** Caption line plus optional invite URL. */
  caption: string;
  inviteUrl?: string | null;
  /** Deck poster image for destinations that take a file. */
  posterUri?: string | null;
  /** Full proof clip on disk. */
  clipUri?: string | null;
  /** Short social cut when present; falls back to the full clip. */
  socialClipUri?: string | null;
};

/**
 * Opens a named destination with the caption, link, and optional media.
 * Prefers deep links into the app (WhatsApp, Messages, X, Instagram Stories).
 * Falls back to the system sheet only when the app is missing or the destination
 * needs a file handoff (Status, overflow, Send clip).
 */
export async function openShareDestination(
  destination: ShareDestinationId,
  payload: SharePayload,
): Promise<void> {
  const caption = buildCaption(payload);

  switch (destination) {
    case 'whatsapp':
      await openWhatsApp(caption);
      return;
    case 'status':
      await openStatus(payload, caption);
      return;
    case 'messages':
      await openMessages(caption);
      return;
    case 'copy':
      await Clipboard.setStringAsync(payload.inviteUrl?.trim() || caption);
      return;
    case 'instagram':
      await openInstagram(payload, caption);
      return;
    case 'x':
      await openX(caption);
      return;
    case 'clip':
      await shareFileOrCaption({
        fileUri: payload.clipUri,
        caption,
        mimeType: 'video/mp4',
        surface: 'proof_clip',
      });
      return;
    case 'overflow':
      await shareFileOrCaption({
        fileUri: payload.posterUri ?? payload.socialClipUri ?? payload.clipUri,
        caption,
        mimeType: payload.posterUri ? 'image/png' : 'video/mp4',
        surface: 'proof_overflow',
      });
      return;
  }
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

function appBundleId(): string {
  return (
    Constants.expoConfig?.ios?.bundleIdentifier ??
    Constants.expoConfig?.android?.package ??
    'com.healthyapp.app'
  );
}

async function openWhatsApp(caption: string): Promise<void> {
  const url = `whatsapp://send?text=${encodeURIComponent(caption)}`;
  if (await canOpen(url)) {
    await Linking.openURL(url);
    return;
  }
  await shareWithTracking('proof_whatsapp', textShareContent(caption));
}

/**
 * Status needs a media file so WhatsApp / system share can offer Status.
 * Opens with the short social cut when present.
 */
async function openStatus(payload: SharePayload, caption: string): Promise<void> {
  const fileUri = payload.socialClipUri ?? payload.clipUri ?? payload.posterUri;
  const mimeType = payload.posterUri && !payload.socialClipUri && !payload.clipUri
    ? 'image/png'
    : 'video/mp4';
  await shareFileOrCaption({
    fileUri,
    caption,
    mimeType,
    surface: 'proof_status',
  });
}

async function openInstagram(payload: SharePayload, caption: string): Promise<void> {
  const imageUri = payload.posterUri;
  const videoUri = payload.socialClipUri ?? payload.clipUri;

  if (imageUri && (await tryInstagramStoriesImage(imageUri))) {
    return;
  }

  await shareFileOrCaption({
    fileUri: videoUri ?? imageUri,
    caption,
    mimeType: videoUri ? 'video/mp4' : 'image/png',
    surface: 'proof_instagram',
  });
}

/**
 * Best-effort Instagram Stories: put the poster on the pasteboard and open the
 * Stories share URL. Falls through when IG is missing or the paste fails.
 */
async function tryInstagramStoriesImage(imageUri: string): Promise<boolean> {
  const storiesUrl = `instagram-stories://share?source_application=${encodeURIComponent(appBundleId())}`;
  if (!(await canOpen(storiesUrl))) {
    return false;
  }

  try {
    const base64 = await readAsStringAsync(imageUri, {
      encoding: EncodingType.Base64,
    });
    await Clipboard.setImageAsync(base64);
    await Linking.openURL(storiesUrl);
    return true;
  } catch {
    return false;
  }
}

async function openX(caption: string): Promise<void> {
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

async function openMessages(caption: string): Promise<void> {
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

async function shareFileOrCaption(input: {
  fileUri: string | null | undefined;
  caption: string;
  mimeType: string;
  surface: string;
}): Promise<void> {
  if (input.fileUri && (await Sharing.isAvailableAsync())) {
    await Sharing.shareAsync(input.fileUri, {
      mimeType: input.mimeType,
      UTI: input.mimeType === 'image/png' ? 'public.png' : 'public.mpeg-4',
      dialogTitle: input.caption.slice(0, 80) || undefined,
    });
    return;
  }

  await shareWithTracking(input.surface, textShareContent(input.caption));
}
