import { formatClockTime } from '@/lib/clock-time';

/** The waits Finish what you started has always offered. */
export const NUDGE_DELAY_MINUTES = [15, 30, 60, 120] as const;

const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 1_440;

/** `15 min`, `1 hour`, `2 hours`: the big label on each choice. */
export function nudgeDelayLabel(minutes: number): string {
  if (minutes < MINUTES_PER_HOUR || minutes % MINUTES_PER_HOUR !== 0) {
    return `${minutes} min`;
  }

  const hours = minutes / MINUTES_PER_HOUR;
  return hours === 1 ? '1 hour' : `${hours} hours`;
}

/** The line under the switch, such as `After 30 minutes`. */
export function nudgeDelaySummary(minutes: number): string {
  if (minutes < MINUTES_PER_HOUR || minutes % MINUTES_PER_HOUR !== 0) {
    return `After ${minutes} minutes`;
  }

  return `After ${nudgeDelayLabel(minutes)}`;
}

/** When the nudge would land if a log were left unfinished right now. */
export function nudgeLandingLabel(now: Date, minutes: number): string {
  const minuteOfDay = now.getHours() * MINUTES_PER_HOUR + now.getMinutes();
  return `At ${formatClockTime((minuteOfDay + minutes) % MINUTES_PER_DAY)}`;
}
