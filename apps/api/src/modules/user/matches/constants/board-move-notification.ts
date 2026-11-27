/**
 * Copy for when a group mate's score moves the board. The title names the
 * rival and what they did to you; the body carries both scores and the time
 * left, so the stakes read from the lock screen without opening the app.
 */

export type BoardMoveUrgency = 'ahead' | 'tied' | 'close' | 'routine';

export type BoardMoveCopyInput = {
  actorDisplayName: string;
  urgency: BoardMoveUrgency;
  actorScore: number;
  recipientScore: number;
  /** "1 day left", from `matchTimeLeft`. */
  timeLeft: string;
};

export type BoardMoveCopy = {
  title: string;
  body: string;
};

/** A trailing score is close when within 10% of the higher one, or 5 points. */
export function isWithinCloseMargin(trailingScore: number, higherScore: number): boolean {
  const gap = higherScore - trailingScore;
  const closeMargin = Math.max(5, Math.ceil(higherScore * 0.1));
  return gap > 0 && gap <= closeMargin;
}

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
  if (actorScoreAfter > recipientScore && actorScoreBefore <= recipientScore) {
    return 'ahead';
  }

  if (actorScoreAfter === recipientScore && actorScoreAfter > 0) {
    return 'tied';
  }

  if (recipientScore <= 0 || actorScoreAfter <= 0) {
    return 'routine';
  }

  return isWithinCloseMargin(actorScoreAfter, recipientScore) ? 'close' : 'routine';
}

function boardMoveTitle(actorDisplayName: string, urgency: BoardMoveUrgency): string {
  switch (urgency) {
    case 'ahead':
      return `${actorDisplayName} passed you`;
    case 'tied':
      return `${actorDisplayName} caught you`;
    case 'close':
      return `${actorDisplayName}'s closing in`;
    case 'routine':
      return `${actorDisplayName} scored`;
  }
}

function boardMoveBody(input: BoardMoveCopyInput): string {
  if (input.urgency === 'tied') {
    return `Both on ${input.recipientScore} · ${input.timeLeft}`;
  }

  if (input.actorScore <= 0) {
    return input.timeLeft;
  }

  return `${input.actorScore} to your ${input.recipientScore} · ${input.timeLeft}`;
}

export function boardMovePushCopy(input: BoardMoveCopyInput): BoardMoveCopy {
  return {
    title: boardMoveTitle(input.actorDisplayName, input.urgency),
    body: boardMoveBody(input),
  };
}

export function boardMoveIdempotencyKey(
  matchId: string,
  attemptOrEventId: string,
  recipientUserId: string,
): string {
  return `match_board_move:${matchId}:${attemptOrEventId}:${recipientUserId}`;
}
