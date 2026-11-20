import type { HealthCategory } from '@product/client';
import { daysBetweenDayKeys, dayKeyName, shiftDayKey } from '@/components/home/day-keys';
import type { HealthTip } from './constants/health-tips';
import { TIP_HISTORY_DAYS } from './constants/tip-history';
import { selectDailyTip } from './select-daily-tip';

export interface PastTip {
  tip: HealthTip;
  dayKey: string;
}

/**
 * The tips you were given on earlier days, newest first. The daily tip is a
 * pure function of the day and your conditions, so the days can be replayed
 * rather than stored. A tip that came round again is listed once, on its
 * latest day.
 */
export function earlierTips(input: {
  catalog: readonly HealthTip[];
  categories: readonly HealthCategory[];
  todayKey: string;
  joinedDayKey: string;
}): PastTip[] {
  const todayTip = selectDailyTip(input.catalog, input.categories, input.todayKey);
  const seen = new Set<string>(todayTip ? [todayTip.id] : []);
  const pastTips: PastTip[] = [];

  for (let daysBack = 1; daysBack <= TIP_HISTORY_DAYS; daysBack += 1) {
    const dayKey = shiftDayKey(input.todayKey, -daysBack);
    if (dayKey < input.joinedDayKey) {
      break;
    }

    const tip = selectDailyTip(input.catalog, input.categories, dayKey);
    if (!tip || seen.has(tip.id)) {
      continue;
    }

    seen.add(tip.id);
    pastTips.push({ tip, dayKey });
  }

  return pastTips;
}

/** "Yesterday", "Tuesday" within the week, then "16 October". */
export function tipDayLabel(dayKey: string, todayKey: string): string {
  const daysAgo = daysBetweenDayKeys(dayKey, todayKey);
  if (daysAgo === 1) {
    return 'Yesterday';
  }

  return daysAgo < 7 ? dayKeyName(dayKey, 'weekday') : dayKeyName(dayKey, 'date');
}
