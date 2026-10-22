import type { MatchReactionKind } from '@product/contract';

/** One tap, keyed the way the table's unique index is. */
export type MatchReactionKey = {
  matchId: string;
  fromUserId: string;
  toUserId: string;
  dayKey: string;
};

export type NewMatchReaction = MatchReactionKey & { kind: MatchReactionKind };
