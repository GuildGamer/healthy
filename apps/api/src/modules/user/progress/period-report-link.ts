/** HTTPS link in a recap email. The site claims this path and hands it to the app. */
export function periodReportOpenUrl(
  websiteUrl: string,
  period: string,
  onDayKey: string,
): string {
  const base = websiteUrl.replace(/\/$/, '');
  const params = new URLSearchParams({ period, on: onDayKey });
  return `${base}/progress/report?${params.toString()}`;
}
