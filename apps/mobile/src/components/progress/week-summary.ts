import type { ProgressDays } from '@product/client';
import { weekDayKeys } from '@/components/home/day-keys';
import type { WeekDayState, WeekSummary } from './types/progress';

type WeekInput = Pick<ProgressDays, 'dayKey' | 'weekStartKey' | 'joinedDayKey' | 'days'>;

function stateFor(dayKey: string, progress: WeekInput, shownUp: ReadonlySet<string>): WeekDayState {
  if (dayKey < progress.joinedDayKey) {
    return 'beforeJoining';
  }

  if (dayKey > progress.dayKey) {
    return 'upcoming';
  }

  if (shownUp.has(dayKey)) {
    return 'shownUp';
  }

  return dayKey === progress.dayKey ? 'open' : 'missed';
}

/** This week as the card on You draws it, counted only from the day you joined. */
export function buildWeekSummary(progress: WeekInput): WeekSummary {
  const shownUp = new Set(progress.days.filter((day) => day.isShownUp).map((day) => day.dayKey));
  const days = weekDayKeys(progress.weekStartKey).map((dayKey) => ({
    dayKey,
    state: stateFor(dayKey, progress, shownUp),
    isToday: dayKey === progress.dayKey,
  }));

  return {
    days,
    shownUpCount: days.filter((day) => day.state === 'shownUp').length,
    countedDays: days.filter((day) => day.state !== 'beforeJoining' && day.state !== 'upcoming')
      .length,
    isTodayOpen: days.some((day) => day.state === 'open'),
  };
}
