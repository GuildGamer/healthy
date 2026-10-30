import type { MetricPeriod, PeriodReportPeriod } from '@product/contract';
import { periodKeyFor } from '../../../shared/utils/period-key.js';
import { shiftDayKey } from '../../../shared/utils/day-key.js';

export type PeriodWindow = {
  startDayKey: string;
  endDayKey: string;
  periodLabel: string;
};

/** First day of the member's local calendar year containing `dayKey`. */
function yearStartKey(dayKey: string): string {
  return `${dayKey.slice(0, 4)}-01-01`;
}

function monthName(dayKey: string): string {
  const month = Number(dayKey.slice(5, 7));
  return (
    [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ][month - 1] ?? dayKey.slice(0, 7)
  );
}

/** Compact day label such as "Oct 20". */
function shortDay(dayKey: string): string {
  const date = new Date(`${dayKey}T12:00:00.000Z`);
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

function weekLabel(startDayKey: string, endDayKey: string): string {
  const start = shortDay(startDayKey);
  const endDay = endDayKey.slice(8, 10).replace(/^0/, '');
  if (startDayKey.slice(0, 7) === endDayKey.slice(0, 7)) {
    return `${start}–${endDay}`;
  }
  return `${start}–${shortDay(endDayKey)}`;
}

/**
 * Inclusive local-day window for a period report or metric total, clamped to
 * the member's join day so empty pre-join days never inflate the range.
 */
export function periodWindowFor(input: {
  period: PeriodReportPeriod | MetricPeriod;
  timeZone: string;
  dayKey: string;
  weekStartKey: string;
  joinedDayKey: string;
  now?: Date;
}): PeriodWindow {
  const { period, timeZone, dayKey, weekStartKey, joinedDayKey } = input;
  const now = input.now ?? new Date();

  let startDayKey: string;
  let periodLabel: string;

  if (period === 'week') {
    startDayKey = weekStartKey;
    periodLabel = weekLabel(weekStartKey, dayKey);
  } else if (period === 'month') {
    startDayKey = periodKeyFor('monthly', timeZone, now);
    periodLabel = monthName(dayKey);
  } else if (period === 'year') {
    startDayKey = yearStartKey(dayKey);
    periodLabel = dayKey.slice(0, 4);
  } else {
    startDayKey = joinedDayKey;
    periodLabel = 'All time';
  }

  if (startDayKey < joinedDayKey) {
    startDayKey = joinedDayKey;
  }

  return { startDayKey, endDayKey: dayKey, periodLabel };
}

/** Walk length in whole minutes; other metrics use rep/second counts. */
export function metricUnit(metric: string): string {
  if (metric === 'walk') {
    return 'minutes';
  }
  if (metric === 'plank') {
    return 'seconds';
  }
  return metricLabel(metric).toLowerCase();
}

export function metricLabel(metric: string): string {
  const labels: Record<string, string> = {
    walk: 'Walk',
    pushups: 'Push-ups',
    squats: 'Squats',
    plank: 'Plank',
    jumping_jacks: 'Jumping jacks',
    burpees: 'Burpees',
    sit_ups: 'Sit-ups',
    mountain_climbers: 'Mountain climbers',
    lunges: 'Lunges',
  };
  return labels[metric] ?? metric;
}

export function sessionAmount(
  metric: string,
  count: number | null,
  durationSeconds: number | null,
): number {
  if (metric === 'walk') {
    return Math.max(Math.floor((durationSeconds ?? 0) / 60), 0);
  }
  if (metric === 'plank') {
    return durationSeconds ?? count ?? 0;
  }
  return count ?? 0;
}

/** Next day after `endDayKey` so an exclusive upper bound stays stable. */
export function dayAfter(endDayKey: string): string {
  return shiftDayKey(endDayKey, 1);
}
