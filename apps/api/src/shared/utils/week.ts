/**
 * Ranking periods are UTC, unlike challenge days which follow the user's own
 * zone. A leaderboard compares people against each other, so everyone has to
 * be measured over the identical window — a per-user week would let someone in
 * a late zone keep earning after a rival's week had already closed.
 */

const DAYS_PER_WEEK = 7;
const MONDAY = 1;

export function startOfUtcWeek(at: Date = new Date()): Date {
  const start = new Date(at);
  const daysSinceMonday = (start.getUTCDay() - MONDAY + DAYS_PER_WEEK) % DAYS_PER_WEEK;

  start.setUTCDate(start.getUTCDate() - daysSinceMonday);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

/** `YYYY-MM-DD` of the Monday the period opened. */
export function weekStartKey(at: Date = new Date()): string {
  return startOfUtcWeek(at).toISOString().slice(0, 10);
}
