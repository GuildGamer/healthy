import type { BoardMoveUrgency } from './constants/board-move-notification.js';
import type {
  BoardPushDecision,
  RecipientPushState,
} from './types/group-board-push-policy.js';

export function isCompetitiveUrgency(urgency: BoardMoveUrgency): boolean {
  return urgency === 'ahead' || urgency === 'tied' || urgency === 'close';
}

/**
 * Lock-screen eligibility. Competitive always; routine only when this actor
 * has not already pushed the recipient in the coalesce window.
 */
export function shouldPushToRecipient(state: RecipientPushState): boolean {
  if (isCompetitiveUrgency(state.urgency)) {
    return true;
  }

  return !state.pushedInCoalesceWindow;
}

/**
 * Inbox always; this returns who gets `delivery.send`.
 */
export function selectPushRecipients(
  candidates: readonly RecipientPushState[],
): BoardPushDecision {
  return {
    pushUserIds: candidates
      .filter((candidate) => shouldPushToRecipient(candidate))
      .map((candidate) => candidate.userId),
  };
}
