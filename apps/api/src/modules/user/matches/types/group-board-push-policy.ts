import type { BoardMoveUrgency } from '../constants/board-move-notification.js';

export type GroupPushMode = 'grow' | 'standard' | 'busy';

export type GroupPushModeInput = {
  acceptedCount: number;
  attemptsLast30m: number;
  attemptsLast24h: number;
};

export type RecipientPushState = {
  userId: string;
  urgency: BoardMoveUrgency;
  /** Rank on the board after this event (1 = leader). */
  rank: number;
  /** Actor's rank after this event, for adjacency. */
  actorRank: number;
  /**
   * When known: whether this recipient has already scored today. Missing means
   * the signal is unused (attempt-driven contests).
   */
  movedToday?: boolean;
};

export type BoardPushDecision = {
  mode: GroupPushMode;
  /** Recipients who get a lock-screen push. Inbox is always written for all. */
  pushUserIds: readonly string[];
};
