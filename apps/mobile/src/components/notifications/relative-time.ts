const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Short relative label for inbox rows. */
export function formatRelativeTime(
  createdAt: string,
  now: Date = new Date(),
): string {
  const then = new Date(createdAt);
  const elapsedSeconds = Math.max(
    0,
    Math.round((now.getTime() - then.getTime()) / 1000),
  );

  if (elapsedSeconds < MINUTE) {
    return 'Just now';
  }

  if (elapsedSeconds < HOUR) {
    return `${Math.floor(elapsedSeconds / MINUTE)}m ago`;
  }

  if (elapsedSeconds < DAY) {
    return `${Math.floor(elapsedSeconds / HOUR)}h ago`;
  }

  if (elapsedSeconds < 7 * DAY) {
    return `${Math.floor(elapsedSeconds / DAY)}d ago`;
  }

  return then.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}
