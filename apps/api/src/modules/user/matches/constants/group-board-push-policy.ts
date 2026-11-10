/**
 * Same-actor routine lock-screen coalesce. Competitive urgencies ignore this.
 * Inbox rows stay per attempt.
 */
export const BOARD_PUSH_COALESCE_MS = 10 * 60 * 1000;

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
