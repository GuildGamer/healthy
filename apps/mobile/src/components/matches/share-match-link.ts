import { Platform, Share, type ShareContent } from 'react-native';

type ShareMatchLinkOptions = {
  url: string;
  /** Competition framing for the distribution experiment. */
  hostScore?: number | null;
  metricLabel?: string;
};

export async function shareMatchLink(urlOrOptions: string | ShareMatchLinkOptions): Promise<void> {
  const inviteUrl = typeof urlOrOptions === 'string' ? urlOrOptions : urlOrOptions.url;
  const message = typeof urlOrOptions === 'string' ? inviteUrl : shareMessage(urlOrOptions);

  await Share.share(inviteShareContent(message, inviteUrl));
}

function shareMessage(options: ShareMatchLinkOptions): string {
  const { url, hostScore, metricLabel } = options;
  const scoreLine =
    hostScore != null && hostScore > 0
      ? `I did ${hostScore}${metricLabel ? ` ${metricLabel}` : ''}. Think you can beat me?\n`
      : 'Think you can beat me?\n';

  return `${scoreLine}${url}`;
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
