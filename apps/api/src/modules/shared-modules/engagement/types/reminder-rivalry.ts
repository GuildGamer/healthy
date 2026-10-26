import type { MatchMetric, MatchScoringMode } from '@product/contract';

export const REMINDER_RIVALRY_SITUATIONS = [
  'group_closing',
  'group_streak_gap',
  'group_rival_moved',
  'group_defend',
] as const;

export type ReminderRivalrySituation = (typeof REMINDER_RIVALRY_SITUATIONS)[number];

/**
 * The one live group worth naming in a member's daily reminder, and why.
 * Built by the groups module; engagement only turns it into copy.
 */
export type ReminderRivalry = {
  matchId: string;
  situation: ReminderRivalrySituation;
  contestTitle: string;
  scoringMode: MatchScoringMode;
  metric: MatchMetric;
  /** First name of the group mate the copy is about. */
  rivalName: string;
  rivalScore: number;
  yourScore: number;
  /** "1 day left", from `matchTimeLeft`. */
  timeLeft: string;
};

export type ReminderRivalryRequest = {
  userId: string;
  timeZone: string;
};

/**
 * Provided by the groups module. Must fail closed: a member who opted out of
 * group pushes, or whose group already had its push today, gets no entry.
 */
export interface ReminderRivalrySource {
  loadMany(
    requests: readonly ReminderRivalryRequest[],
    now: Date,
  ): Promise<Map<string, ReminderRivalry>>;
}
