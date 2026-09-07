const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export function formatMatchTimeLeft(
  endsAt: string,
  now: Date = new Date(),
): string {
  const remaining = new Date(endsAt).getTime() - now.getTime();
  if (remaining <= 0) {
    return 'Ended';
  }

  if (remaining >= DAY_MS) {
    const days = Math.floor(remaining / DAY_MS);
    return days === 1 ? '1 day left' : `${days} days left`;
  }

  if (remaining >= HOUR_MS) {
    const hours = Math.floor(remaining / HOUR_MS);
    return hours === 1 ? '1 hour left' : `${hours} hours left`;
  }

  const minutes = Math.max(1, Math.floor(remaining / MINUTE_MS));
  return minutes === 1 ? '1 minute left' : `${minutes} minutes left`;
}
