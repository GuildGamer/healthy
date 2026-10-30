import { previousDayKey } from '../../../shared/utils/day-key.js';
import type { StoredStreak, StreakStatus } from './types/streak.js';

/**
 * Day keys are `YYYY-MM-DD`, so string order is calendar order. A key later
 * than today only happens after a move to a zone behind the old one; that day
 * was already counted, so it is treated as today rather than as a break.
 */
function isOnOrAfter(dayKey: string, otherDayKey: string): boolean {
  return dayKey >= otherDayKey;
}

/** The streak after counting activity today. Calling it twice in a day changes nothing. */
export function advancedStreakDays(streak: StoredStreak): number {
  const { storedStreakDays, lastActiveDayKey, todayKey } = streak;
  if (!lastActiveDayKey) {
    return 1;
  }

  if (isOnOrAfter(lastActiveDayKey, todayKey)) {
    return Math.max(storedStreakDays, 1);
  }

  return lastActiveDayKey === previousDayKey(todayKey) ? storedStreakDays + 1 : 1;
}

/** Whichever of the two days is later, so a zone change never rewinds the record. */
export function laterDayKey(lastActiveDayKey: string | null, todayKey: string): string {
  if (!lastActiveDayKey) {
    return todayKey;
  }

  return isOnOrAfter(lastActiveDayKey, todayKey) ? lastActiveDayKey : todayKey;
}

/**
 * The stored count only moves on activity, so a user who stops would keep
 * seeing a streak they already broke. It expires on read instead of in a
 * nightly job. A run whose last day was the day before yesterday broke
 * yesterday, which Today mentions once.
 */
export function streakStatusFor(streak: StoredStreak): StreakStatus {
  const { storedStreakDays, lastActiveDayKey, todayKey } = streak;
  if (storedStreakDays === 0 || !lastActiveDayKey) {
    return { currentStreakDays: 0, streakLapsedYesterday: false };
  }

  const yesterday = previousDayKey(todayKey);
  if (isOnOrAfter(lastActiveDayKey, yesterday)) {
    return { currentStreakDays: storedStreakDays, streakLapsedYesterday: false };
  }

  return {
    currentStreakDays: 0,
    streakLapsedYesterday: lastActiveDayKey === previousDayKey(yesterday),
  };
}
