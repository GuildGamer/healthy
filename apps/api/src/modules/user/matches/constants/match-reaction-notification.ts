import {
  matchGroupPhrase,
  matchTimeLeft,
  type MatchPushCopy,
  type MatchScoringMode,
  type MatchMetric,
  type MatchDailyScope,
} from '@product/contract';

/**
 * A cheer is never unwelcome, but five of them are five buzzes. The first
 * cheer of the day names its sender and the rest land silently on the board.
 */
export function matchCheerPush(input: {
  senderName: string;
  scoringMode: MatchScoringMode;
  metric: MatchMetric;
  dailyScope: MatchDailyScope;
  endsAt: string;
  now?: Date;
}): MatchPushCopy {
  return {
    title: `${input.senderName} cheered you on`,
    body: `${matchTimeLeft(input.endsAt, input.now)} in ${matchGroupPhrase(input)}.`,
  };
}

/** One cheer push per recipient per group per day, however many people cheer. */
export function matchCheerIdempotencyKey(
  matchId: string,
  toUserId: string,
  dayKey: string,
): string {
  return `match_cheer:${matchId}:${toUserId}:${dayKey}`;
}

/** One nudge per sender, recipient and day — the same key as the reaction row. */
export function matchNudgeIdempotencyKey(
  matchId: string,
  fromUserId: string,
  toUserId: string,
  dayKey: string,
): string {
  return `match_nudge:${matchId}:${fromUserId}:${toUserId}:${dayKey}`;
}
