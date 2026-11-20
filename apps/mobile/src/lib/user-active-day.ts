/** Local calendar day key for once-per-day `user_active` emits. */
export function localActiveDayKey(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * SecureStore keys allow letters, digits, `.`, `-` and `_` only.
 * A colon would throw and silently drop the event.
 */
export function userActiveStorageKey(dayKey: string): string {
  return `user_active_day_${dayKey}`;
}
