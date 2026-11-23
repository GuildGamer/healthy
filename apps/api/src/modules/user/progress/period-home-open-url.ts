/** HTTPS link that opens the day deck. Used when a recap period was quiet. */
export function periodHomeOpenUrl(websiteUrl: string): string {
  const base = websiteUrl.replace(/\/$/, '');
  return `${base}/open`;
}
