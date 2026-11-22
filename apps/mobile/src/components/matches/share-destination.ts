import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import { Linking, Platform } from 'react-native';
import { shareWithTracking } from '@/lib/analytics';

export type ShareDestinationId =
  | 'whatsapp'
  | 'status'
  | 'instagram'
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
 * Never waits on an upload. Falls back to the system sheet when a deep link
 * is unavailable.
 */
export async function openShareDestination(
  destination: ShareDestinationId,
  payload: SharePayload,
): Promise<void> {
  const caption = buildCaption(payload);

  switch (destination) {
    case 'whatsapp':
    case 'status':
      await openWhatsApp(caption);
      return;
    case 'messages':
      await openMessages(caption);
      return;
    case 'copy':
      await Clipboard.setStringAsync(payload.inviteUrl?.trim() || caption);
      return;
    case 'instagram':
      await shareFileOrCaption({
        fileUri: payload.socialClipUri ?? payload.posterUri ?? payload.clipUri,
        caption,
        mimeType: payload.socialClipUri || (!payload.posterUri && payload.clipUri)
          ? 'video/mp4'
          : 'image/png',
        surface: 'proof_instagram',
      });
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

async function openWhatsApp(caption: string): Promise<void> {
  const url = `whatsapp://send?text=${encodeURIComponent(caption)}`;
  if (await Linking.canOpenURL(url)) {
    await Linking.openURL(url);
    return;
  }
  await shareWithTracking('proof_whatsapp', textShareContent(caption));
}

async function openMessages(caption: string): Promise<void> {
  const url =
    Platform.OS === 'ios'
      ? `sms:&body=${encodeURIComponent(caption)}`
      : `sms:?body=${encodeURIComponent(caption)}`;
  if (await Linking.canOpenURL(url)) {
    await Linking.openURL(url);
    return;
  }
  await shareWithTracking('proof_messages', textShareContent(caption));
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
