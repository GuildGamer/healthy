import type { MatchMetric, MatchScoringMode } from '@product/contract/match-board';
import { Platform, Share, type ShareContent } from 'react-native';
import { inviteShareMessage } from './invite-message';

export type ShareMatchLinkOptions = {
  url: string;
  hostScore?: number | null;
  /** Host-typed contest name; omitted when they left it blank. */
  hostTitle?: string | null;
  metric: MatchMetric;
  scoringMode: MatchScoringMode;
  endsAt?: string | Date | null;
};

export async function shareMatchLink(options: ShareMatchLinkOptions): Promise<void> {
  const message = `${inviteShareMessage(options)}\n${options.url}`;
  await Share.share(inviteShareContent(message, options.url));
}

/**
 * iOS puts `message` and `url` in the share sheet as separate items, and
 * targets such as Messages append them. A message that already contains the
 * invite therefore ships two links. Android ignores `url` and shares `message`.
 */
function inviteShareContent(message: string, inviteUrl: string): ShareContent {
  if (Platform.OS !== 'ios') {
    return { message };
  }

  const text = message.split(inviteUrl).join('').trim();
  if (text.length === 0) {
    return { url: inviteUrl };
  }

  return { message: text, url: inviteUrl };
}
