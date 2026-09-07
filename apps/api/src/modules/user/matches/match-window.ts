import type { MatchWindow } from '@product/contract';
import { dayKeyFor } from '../../../shared/utils/day-key.js';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const SEARCH_HORIZON_MS = 36 * 60 * 60 * 1000;

/** First instant after `at` whose local calendar day differs. */
export function startOfNextLocalDay(timeZone: string, at: Date): Date {
  const today = dayKeyFor(timeZone, at);
  let low = at.getTime();
  let high = at.getTime() + SEARCH_HORIZON_MS;

  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if (dayKeyFor(timeZone, new Date(mid)) === today) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return new Date(high);
}

export function matchWindowBounds(
  window: MatchWindow,
  timeZone: string,
  now: Date,
): { startsAt: Date; endsAt: Date } {
  if (window === 'week') {
    return {
      startsAt: now,
      endsAt: new Date(now.getTime() + WEEK_MS),
    };
  }

  return {
    startsAt: now,
    endsAt: startOfNextLocalDay(timeZone, now),
  };
}
