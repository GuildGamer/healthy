const MINUTES_PER_DAY = 24 * 60;
const MS_PER_MINUTE = 60_000;

export type SleepWindow = {
  wentToBedAt: string;
  wokeUpAt: string;
};

function startOfLocalDay(at: Date): Date {
  return new Date(at.getFullYear(), at.getMonth(), at.getDate());
}

function atMinuteOfDay(day: Date, minuteOfDay: number): Date {
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute, 0, 0);
}

function addDays(day: Date, days: number): Date {
  const next = new Date(day);
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * Turns the two picked clock times into ISO instants for last night's sleep.
 * Wake falls on today, or yesterday when that clock time has not happened yet.
 * Bedtime falls on the day before wake when it is later in the day than wake.
 */
export function sleepWindow(
  bedMinute: number,
  wakeMinute: number,
  now: Date = new Date(),
): SleepWindow {
  const bed = ((bedMinute % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const wake = ((wakeMinute % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const today = startOfLocalDay(now);
  const wakeToday = atMinuteOfDay(today, wake);
  const wakeDay = wakeToday.getTime() <= now.getTime() ? today : addDays(today, -1);
  const bedDay = bed > wake ? addDays(wakeDay, -1) : wakeDay;

  return {
    wentToBedAt: atMinuteOfDay(bedDay, bed).toISOString(),
    wokeUpAt: atMinuteOfDay(wakeDay, wake).toISOString(),
  };
}

/** Whole minutes between bedtime and wake, or zero when the window is invalid. */
export function sleepDurationMinutes(window: SleepWindow): number {
  const wentToBedAt = Date.parse(window.wentToBedAt);
  const wokeUpAt = Date.parse(window.wokeUpAt);
  if (Number.isNaN(wentToBedAt) || Number.isNaN(wokeUpAt) || wokeUpAt <= wentToBedAt) {
    return 0;
  }

  return Math.round((wokeUpAt - wentToBedAt) / MS_PER_MINUTE);
}

/** "7h 25m", "8h", or "45m". */
export function sleepDurationLabel(durationMinutes: number): string {
  const minutes = Math.max(0, Math.floor(durationMinutes));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (hours === 0) {
    return `${remainder}m`;
  }

  if (remainder === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainder}m`;
}
