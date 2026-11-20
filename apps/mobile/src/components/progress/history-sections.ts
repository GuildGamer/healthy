import type { ProgressDays } from '@product/client';
import { daysBetweenDayKeys, shiftDayKey } from '@/components/home/day-keys';
import { DAYS_PER_WEEK, PROGRESS_COPY } from './constants/progress-copy';
import { weekRangeLabel } from './progress-labels';
import type { HistorySection } from './types/progress';

/** The Monday of `dayKey`'s week, counted from a Monday already known to be one. */
function weekStartOf(dayKey: string, knownMondayKey: string): string {
  const offset = daysBetweenDayKeys(knownMondayKey, dayKey);
  const weeksBack = Math.floor(offset / DAYS_PER_WEEK);
  return shiftDayKey(knownMondayKey, weeksBack * DAYS_PER_WEEK);
}

function sectionTitle(weekStartKey: string, thisWeekStartKey: string): string {
  if (weekStartKey === thisWeekStartKey) {
    return PROGRESS_COPY.thisWeek;
  }

  if (weekStartKey === shiftDayKey(thisWeekStartKey, -DAYS_PER_WEEK)) {
    return PROGRESS_COPY.lastWeek;
  }

  return weekRangeLabel(weekStartKey);
}

/** History's days, newest first, under a heading per week with that week's total. */
export function buildHistorySections(
  progress: Pick<ProgressDays, 'weekStartKey' | 'days'>,
): HistorySection[] {
  const sections: HistorySection[] = [];

  for (const day of progress.days) {
    const weekStartKey = weekStartOf(day.dayKey, progress.weekStartKey);
    const current = sections.at(-1);

    if (current?.weekStartKey === weekStartKey) {
      current.days.push(day);
      current.pointsTotal += day.pointsTotal;
      continue;
    }

    sections.push({
      weekStartKey,
      title: sectionTitle(weekStartKey, progress.weekStartKey),
      pointsTotal: day.pointsTotal,
      days: [day],
    });
  }

  return sections;
}
