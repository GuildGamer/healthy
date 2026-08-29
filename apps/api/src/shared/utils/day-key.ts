/**
 * A "challenge day" is a calendar day in the user's own zone, not UTC. Storing
 * the key as `YYYY-MM-DD` keeps day comparisons string-cheap and stable even if
 * the user later moves to a different zone.
 */

export const DEFAULT_TIME_ZONE = 'UTC';

/** `en-CA` is the locale whose short date format is already `YYYY-MM-DD`. */
const DAY_KEY_LOCALE = 'en-CA';

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat(DAY_KEY_LOCALE, { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function dayKeyFor(timeZone: string, at: Date = new Date()): string {
  const zone = isValidTimeZone(timeZone) ? timeZone : DEFAULT_TIME_ZONE;

  return new Intl.DateTimeFormat(DAY_KEY_LOCALE, {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
}

/**
 * Wall-clock minutes past midnight in the given zone. Reminder times are stored
 * as local minutes, so this is what a dispatch run compares them against.
 */
export function localMinuteOfDay(
  timeZone: string,
  at: Date = new Date(),
): number {
  const zone = isValidTimeZone(timeZone) ? timeZone : DEFAULT_TIME_ZONE;

  const [hour = 0, minute = 0] = new Intl.DateTimeFormat('en-GB', {
    timeZone: zone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
    .format(at)
    .split(':')
    .map(Number);

  return hour * 60 + minute;
}

export function previousDayKey(dayKey: string): string {
  const date = new Date(`${dayKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}
