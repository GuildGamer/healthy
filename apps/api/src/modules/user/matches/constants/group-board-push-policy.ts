/** Rolling window: same actor → same recipient, no second routine push. */
export const BOARD_PUSH_COALESCE_MS = 60 * 60 * 1000;

/** Quiet enough, and small enough, to encourage with routine pushes. */
export const GROW_MAX_PARTICIPANTS = 5;

/** Large enough that routine fan-out would spam the lock screen. */
export const BUSY_MIN_PARTICIPANTS = 10;

/**
 * Grow stays grow only while 24h attempt volume stays below this factor times
 * accepted seats (e.g. 5 seats → under 7.5 attempts).
 */
export const GROW_VELOCITY_24H_FACTOR = 1.5;

/** Cap competitive lock-screen fan-out in busy groups. */
export const BUSY_MAX_RECIPIENTS = 3;

/**
 * 60-minute attempt count that flips a group to busy: at least 3, or 40% of
 * accepted seats (whichever is larger).
 */
export function busyVelocityThreshold(acceptedCount: number): number {
  return Math.max(3, Math.ceil(0.4 * acceptedCount));
}

/**
 * One routine push per actor → recipient → day in grow mode. Distinct from
 * the inbox key, which stays per attempt.
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
