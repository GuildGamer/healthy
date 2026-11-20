const DAY_MS = 24 * 60 * 60 * 1000;
const DAYS_PER_WEEK = 7;

/** Day keys (YYYY-MM-DD) are read at UTC midnight, so no math crosses a zone offset. */
function dayKeyTime(dayKey: string): number {
  return Date.parse(`${dayKey}T00:00:00.000Z`);
}

/** `dayKey` moved by whole days, or unchanged when it is not a day key. */
export function shiftDayKey(dayKey: string, days: number): string {
  const time = dayKeyTime(dayKey);
  if (Number.isNaN(time)) {
    return dayKey;
  }

  return new Date(time + days * DAY_MS).toISOString().slice(0, 10);
}

export function daysBetweenDayKeys(fromKey: string, toKey: string): number {
  return Math.round((dayKeyTime(toKey) - dayKeyTime(fromKey)) / DAY_MS);
}

/** Monday to Sunday of the week opening on `weekStartKey`. */
export function weekDayKeys(weekStartKey: string): string[] {
  return Array.from({ length: DAYS_PER_WEEK }, (_, index) => shiftDayKey(weekStartKey, index));
}

/** "Monday" or "12 October" for a day key, the same on any device zone. */
export function dayKeyName(dayKey: string, format: 'weekday' | 'date'): string {
  const options: Intl.DateTimeFormatOptions =
    format === 'weekday' ? { weekday: 'long' } : { day: 'numeric', month: 'long' };
  return new Date(dayKeyTime(dayKey)).toLocaleDateString('en-GB', { ...options, timeZone: 'UTC' });
}

/** The weekday's initial, as the week strip labels its columns. */
export function weekdayInitial(dayKey: string): string {
  return dayKeyName(dayKey, 'weekday').slice(0, 1);
}
