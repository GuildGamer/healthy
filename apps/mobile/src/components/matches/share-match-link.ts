import { Share } from 'react-native';

type ShareMatchLinkOptions = {
  url: string;
  /** Competition framing for the distribution experiment. */
  hostScore?: number | null;
  metricLabel?: string;
};

export async function shareMatchLink(
  urlOrOptions: string | ShareMatchLinkOptions,
): Promise<void> {
  if (typeof urlOrOptions === 'string') {
    await Share.share({
      message: urlOrOptions,
      url: urlOrOptions,
    });
    return;
  }

  const { url, hostScore, metricLabel } = urlOrOptions;
  const scoreLine =
    hostScore != null && hostScore > 0
      ? `I did ${hostScore}${metricLabel ? ` ${metricLabel}` : ''}. Think you can beat me?\n`
      : 'Think you can beat me?\n';

  await Share.share({
    message: `${scoreLine}${url}`,
    url,
  });
}
