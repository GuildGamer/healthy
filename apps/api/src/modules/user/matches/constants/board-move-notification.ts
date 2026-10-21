/**
 * Copy for when a group mate's score moves the board. Urgent voice when they
 * are close to, tied with, or ahead of the recipient; lighter otherwise.
 * Titles stay action verbs; bodies name the actor. No "log" wording.
 */

export const BOARD_MOVE_URGENT_TITLE = 'Stay ahead';
export const BOARD_MOVE_ROUTINE_TITLE = 'See the board';

export type BoardMoveUrgency = 'ahead' | 'tied' | 'close' | 'routine';

/**
 * How near the actor is to the recipient after this scoring event.
 *
 * - ahead: this event put the actor strictly above the recipient (they were
 *   not already ahead)
 * - tied: same score after the event (both have at least something on the board)
 * - close: actor trails, but the gap is at most 10% of the recipient's score
 *   or 5 points, whichever is larger
 * - routine: everyone else — including when the actor was already ahead
 */
export function boardMoveUrgency(
  actorScoreAfter: number,
  recipientScore: number,
  actorScoreBefore = 0,
): BoardMoveUrgency {
  if (
    actorScoreAfter > recipientScore &&
    actorScoreBefore <= recipientScore
  ) {
    return 'ahead';
  }

  if (actorScoreAfter === recipientScore && actorScoreAfter > 0) {
    return 'tied';
  }

  if (recipientScore <= 0 || actorScoreAfter <= 0) {
    return 'routine';
  }

  const gap = recipientScore - actorScoreAfter;
  const closeMargin = Math.max(5, Math.ceil(recipientScore * 0.1));

  if (gap > 0 && gap <= closeMargin) {
    return 'close';
  }

  return 'routine';
}

export function boardMovePushTitle(urgency: BoardMoveUrgency): string {
  return urgency === 'routine' ? BOARD_MOVE_ROUTINE_TITLE : BOARD_MOVE_URGENT_TITLE;
}

export function boardMovePushBody(
  actorDisplayName: string,
  urgency: BoardMoveUrgency,
): string {
  switch (urgency) {
    case 'ahead':
      return `${actorDisplayName} just passed you.`;
    case 'tied':
      return `${actorDisplayName} matched you.`;
    case 'close':
      return `${actorDisplayName} is on your heels.`;
    case 'routine':
      return `${actorDisplayName} just scored.`;
  }
}
export function boardMoveIdempotencyKey(
  matchId: string,
  attemptOrEventId: string,
  recipientUserId: string,
): string {
  return `match_board_move:${matchId}:${attemptOrEventId}:${recipientUserId}`;
}
