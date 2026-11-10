import type { BoardMoveUrgency } from '../constants/board-move-notification.js';

export type RecipientPushState = {
  userId: string;
  urgency: BoardMoveUrgency;
  /**
   * True when this recipient already got a lock-screen push for the same
   * actor's board_move inside the coalesce window.
   */
  pushedInCoalesceWindow: boolean;
};

export type BoardPushDecision = {
  /** Recipients who get a lock-screen push. Inbox is always written for all. */
  pushUserIds: readonly string[];
};
