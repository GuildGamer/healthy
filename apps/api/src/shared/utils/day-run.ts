import { previousDayKey } from './day-key.js';

/** Length of the longest stretch of consecutive calendar days among `dayKeys`. */
export function longestConsecutiveDayRun(dayKeys: readonly string[]): number {
  const ordered = [...new Set(dayKeys)].sort();
  let longest = 0;
  let current = 0;
  let previous: string | null = null;

  for (const dayKey of ordered) {
    current = previous !== null && previousDayKey(dayKey) === previous ? current + 1 : 1;
    longest = Math.max(longest, current);
    previous = dayKey;
  }

  return longest;
}
