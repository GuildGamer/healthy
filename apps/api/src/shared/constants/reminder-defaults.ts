/** Local wall-clock minutes past midnight, so 1439 is 23:59. */
export const MINUTES_PER_DAY = 1440;

/** 7pm local: late enough to have had the day, early enough not to wake anyone. */
export const DEFAULT_REMINDER_MINUTE = 1140;

/** Keeps a single challenge from turning into a stream of notifications. */
export const MAX_REMINDERS_PER_CHALLENGE = 5;

/**
 * How far back a dispatch run looks. A restart or a slow tick would otherwise
 * drop the reminders whose minute passed while nothing was listening; the
 * delivery ledger stops the overlap from sending twice.
 */
export const DISPATCH_CATCH_UP_MINUTES = 10;
