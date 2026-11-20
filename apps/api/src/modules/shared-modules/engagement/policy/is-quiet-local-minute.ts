import {
  QUIET_HOURS_END_MINUTE,
  QUIET_HOURS_START_MINUTE,
} from './constants.js';

/** True when local wall-clock is in 21:00–07:59 (treatment cadence suppressed). */
export function isQuietLocalMinute(minuteOfDay: number): boolean {
  return (
    minuteOfDay >= QUIET_HOURS_START_MINUTE || minuteOfDay < QUIET_HOURS_END_MINUTE
  );
}
