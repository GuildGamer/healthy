/**
 * A challenge occurrence belongs to a period, not always to a day. The key is
 * the first day of that period in the user's own zone, formatted `YYYY-MM-DD`
 * so it stays string-comparable and reuses the day-key machinery.
 */

import type { ChallengeFrequency } from '@product/db';
import { dayKeyFor, previousDayKey } from './day-key.js';
import { weekStartKey } from './week.js';

/** Midnight UTC on a day key, so date arithmetic never crosses a zone offset. */
function atUtcMidnight(dayKey: string): Date {
  return new Date(`${dayKey}T00:00:00.000Z`);
}

export function periodKeyFor(
  frequency: ChallengeFrequency,
  timeZone: string,
  at: Date = new Date(),
): string {
  const dayKey = dayKeyFor(timeZone, at);

  if (frequency === 'daily') {
    return dayKey;
  }

  if (frequency === 'weekly') {
    // Anchored on the user's local day, then floored to that day's Monday.
    return weekStartKey(atUtcMidnight(dayKey));
  }

  return `${dayKey.slice(0, 'YYYY-MM'.length)}-01`;
}

/**
 * The key of the period immediately before `periodKey`. Used to decide whether
 * a run of completions is still unbroken.
 */
export function previousPeriodKey(
  frequency: ChallengeFrequency,
  periodKey: string,
): string {
  if (frequency === 'daily') {
    return previousDayKey(periodKey);
  }

  const start = atUtcMidnight(periodKey);

  if (frequency === 'weekly') {
    start.setUTCDate(start.getUTCDate() - 7);
  } else {
    start.setUTCMonth(start.getUTCMonth() - 1);
  }

  return start.toISOString().slice(0, 10);
}
