import type { ChallengeHistoryEntry } from '@product/client';
import { daysBetweenDayKeys, dayKeyName, shiftDayKey } from '@/components/home/day-keys';
import { formatClockTime } from '@/lib/clock-time';
import { SETTINGS_COPY } from './constants/routine-copy';

const DAYS_PER_WEEK = 7;
/** JavaScript's Sunday-first weekday, moved to Monday-first. */
const MONDAY_OFFSET = 6;

export type HistoryWeek = {
  weekStartKey: string;
  label: string;
  entries: ChallengeHistoryEntry[];
};

/** The device's own day for an instant, as a day key. */
export function localDayKey(at: Date): string {
  const month = String(at.getMonth() + 1).padStart(2, '0');
  const day = String(at.getDate()).padStart(2, '0');
  return `${at.getFullYear()}-${month}-${day}`;
}

function mondayOf(dayKey: string): string {
  const weekday = new Date(`${dayKey}T00:00:00.000Z`).getUTCDay();
  return shiftDayKey(dayKey, -((weekday + MONDAY_OFFSET) % DAYS_PER_WEEK));
}

function weekLabel(weekStartKey: string, thisWeekKey: string): string {
  const weeksAgo = Math.round(daysBetweenDayKeys(weekStartKey, thisWeekKey) / DAYS_PER_WEEK);
  if (weeksAgo === 0) {
    return SETTINGS_COPY.thisWeek;
  }

  if (weeksAgo === 1) {
    return SETTINGS_COPY.lastWeek;
  }

  return `${SETTINGS_COPY.weekOf} ${dayKeyName(weekStartKey, 'date')}`;
}

/** Newest first, grouped by the Monday-to-Sunday week each was finished in. */
export function groupHistoryByWeek(
  entries: readonly ChallengeHistoryEntry[],
  now: Date,
): HistoryWeek[] {
  const thisWeekKey = mondayOf(localDayKey(now));
  const newestFirst = [...entries].sort((left, right) =>
    right.completedAt.localeCompare(left.completedAt),
  );

  const weeks: HistoryWeek[] = [];
  for (const entry of newestFirst) {
    const weekStartKey = mondayOf(localDayKey(new Date(entry.completedAt)));
    const current = weeks.at(-1);
    if (current?.weekStartKey === weekStartKey) {
      current.entries.push(entry);
      continue;
    }

    weeks.push({ weekStartKey, label: weekLabel(weekStartKey, thisWeekKey), entries: [entry] });
  }

  return weeks;
}

/** "Thursday" within the last week, else "12 October". */
export function historyDayLabel(completedAt: string, now: Date): string {
  const dayKey = localDayKey(new Date(completedAt));
  const daysAgo = daysBetweenDayKeys(dayKey, localDayKey(now));
  return dayKeyName(dayKey, daysAgo < DAYS_PER_WEEK ? 'weekday' : 'date');
}

export function historyTimeLabel(completedAt: string): string {
  return formatClockTime(new Date(completedAt));
}

export function timesLabel(count: number): string {
  return count === 1 ? '1 time' : `${count} times`;
}
