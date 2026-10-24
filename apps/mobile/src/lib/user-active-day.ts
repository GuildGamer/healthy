/** Local calendar day key for once-per-day `user_active` emits. */
export function localActiveDayKey(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function userActiveStorageKey(dayKey: string): string {
  return `user_active_day:${dayKey}`;
}

/** True when this process has not yet recorded activity for `dayKey`. */
export function shouldEmitUserActive(
  storedDayKey: string | null,
  dayKey: string,
): boolean {
  return storedDayKey !== dayKey;
}
