/**
 * Documented same-actor burst window (5 minutes). Lock-screen eligibility no
 * longer coalesces on this — busy mode is the only push throttle.
 */
export const BOARD_PUSH_COALESCE_MS = 5 * 60 * 1000;

/** Quiet enough, and small enough, to encourage with routine pushes. */
export const GROW_MAX_PARTICIPANTS = 5;

/** Large enough that routine fan-out would spam the lock screen. */
export const BUSY_MIN_PARTICIPANTS = 15;

/**
 * Grow stays grow only while 24h attempt volume stays below this factor times
 * accepted seats (e.g. 5 seats → under 7.5 attempts).
 */
export const GROW_VELOCITY_24H_FACTOR = 1.5;

/** Cap competitive lock-screen fan-out in busy groups. */
export const BUSY_MAX_RECIPIENTS = 3;

/** Attempts in this window that flip a group to busy (flat floor). */
export const BUSY_VELOCITY_ATTEMPTS = 10;

/** Lookback for busy velocity (hot session). */
export const BUSY_VELOCITY_WINDOW_MS = 30 * 60 * 1000;

/**
 * Stable key for same-actor routine coalesce bookkeeping. Distinct from the
 * inbox key, which stays per attempt.
 */
export function boardPushRoutineIdempotencyKey(
  matchId: string,
  actorUserId: string,
  recipientUserId: string,
  dayKey: string,
): string {
  return `match_board_push:${matchId}:${actorUserId}:${recipientUserId}:${dayKey}`;
}

/** Competitive pushes stay per attempt so retries do not double-buzz. */
export function boardPushEscalationIdempotencyKey(
  matchId: string,
  attemptOrEventId: string,
  recipientUserId: string,
): string {
  return `match_board_push:${matchId}:${attemptOrEventId}:${recipientUserId}`;
}
