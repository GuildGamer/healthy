export function formatPoints(points: number): string {
  return points.toLocaleString('en-GB');
}

/** "+350", "0", or "−100" with a true minus sign. */
export function formatPointsDelta(points: number): string {
  if (points > 0) {
    return `+${formatPoints(points)}`;
  }

  return points < 0 ? `−${formatPoints(-points)}` : '0';
}
