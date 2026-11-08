import type { BoardMoveUrgency } from './constants/board-move-notification.js';
import {
  BUSY_MAX_RECIPIENTS,
  BUSY_MIN_PARTICIPANTS,
  GROW_MAX_PARTICIPANTS,
  GROW_VELOCITY_24H_FACTOR,
  busyVelocityThreshold,
} from './constants/group-board-push-policy.js';
import type {
  BoardPushDecision,
  GroupPushMode,
  GroupPushModeInput,
  RecipientPushState,
} from './types/group-board-push-policy.js';

/**
 * Busy wins when the group is large or hot; grow only when both small and
 * quiet; everything else is standard (competitive pushes only).
 */
export function resolveGroupPushMode(input: GroupPushModeInput): GroupPushMode {
  const velocityCap = busyVelocityThreshold(input.acceptedCount);
  if (
    input.acceptedCount >= BUSY_MIN_PARTICIPANTS ||
    input.attemptsLast60m >= velocityCap
  ) {
    return 'busy';
  }

  if (
    input.acceptedCount <= GROW_MAX_PARTICIPANTS &&
    input.attemptsLast24h < GROW_VELOCITY_24H_FACTOR * input.acceptedCount
  ) {
    return 'grow';
  }

  return 'standard';
}

export function isCompetitiveUrgency(urgency: BoardMoveUrgency): boolean {
  return urgency === 'ahead' || urgency === 'tied' || urgency === 'close';
}

/**
 * Whether this recipient is eligible for a lock-screen push before busy
 * fan-out. Announce by default: competitive always; routine in grow/standard
 * unless the same actor already pushed them in the short coalesce window.
 * Busy is the only mode that suppresses routine.
 */
export function shouldPushToRecipient(
  mode: GroupPushMode,
  state: RecipientPushState,
): boolean {
  if (isCompetitiveUrgency(state.urgency)) {
    return true;
  }

  if (mode === 'busy') {
    return false;
  }

  if (state.pushedInCoalesceWindow) {
    return false;
  }

  return true;
}

/**
 * How much a busy-mode recipient cares about this board move. Higher weight
 * means more likely to get one of the scarce push slots.
 */
export function rivalryWeightForBusyFanOut(state: RecipientPushState): number {
  let weight = 0;

  switch (state.urgency) {
    case 'ahead':
      weight += 4;
      break;
    case 'tied':
      weight += 3;
      break;
    case 'close':
      weight += 2;
      break;
    case 'routine':
      break;
  }

  if (state.rank === 1) {
    weight += 2;
  } else if (state.rank === 2) {
    weight += 1;
  }

  if (Math.abs(state.rank - state.actorRank) === 1) {
    weight += 2;
  }

  if (state.movedToday === false) {
    weight += 1;
  }

  return weight;
}

/**
 * Highest rivalry weight first; ties break on tighter rank (closer to #1),
 * then stable userId order.
 */
export function rankRecipientsForBusyFanOut(
  candidates: readonly RecipientPushState[],
): RecipientPushState[] {
  return [...candidates].sort((left, right) => {
    const weightDelta =
      rivalryWeightForBusyFanOut(right) - rivalryWeightForBusyFanOut(left);
    if (weightDelta !== 0) {
      return weightDelta;
    }

    if (left.rank !== right.rank) {
      return left.rank - right.rank;
    }

    return left.userId.localeCompare(right.userId);
  });
}

/**
 * Inbox always; this returns who gets `delivery.send`. Busy mode keeps only
 * the top rivalry recipients among those already eligible to push.
 */
export function selectPushRecipients(
  mode: GroupPushMode,
  candidates: readonly RecipientPushState[],
): BoardPushDecision {
  const eligible = candidates.filter((candidate) =>
    shouldPushToRecipient(mode, candidate),
  );

  if (mode !== 'busy') {
    return {
      mode,
      pushUserIds: eligible.map((candidate) => candidate.userId),
    };
  }

  const top = rankRecipientsForBusyFanOut(eligible).slice(0, BUSY_MAX_RECIPIENTS);
  return {
    mode,
    pushUserIds: top.map((candidate) => candidate.userId),
  };
}
