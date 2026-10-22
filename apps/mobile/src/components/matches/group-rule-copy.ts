import type { MatchDailyScope, MatchMetric, MatchScoringMode } from '@product/client';
import { MATCH_CUMULATIVE_DAILY_CAP_BY_METRIC } from '@product/contract/match-board';
import { MATCH_MODE_LABEL } from './match-copy';

/** The three facts that decide how a group is won, as every screen reads them. */
export type GroupRules = {
  scoringMode: MatchScoringMode;
  metric: MatchMetric;
  dailyScope: MatchDailyScope;
};

const ACTIVITY_ADJECTIVE: Record<MatchMetric, string> = {
  pushups: 'Push-up',
  walk: 'Walking',
};

const ACTIVITY_NOUN: Record<MatchMetric, string> = {
  pushups: 'push-up',
  walk: 'walking',
};

/** A streak open to every daily challenge names no activity, so nothing hints at a condition. */
export function isOpenStreak(rules: GroupRules): boolean {
  return rules.scoringMode === 'days_completed' && rules.dailyScope === 'any_challenge';
}

/** "Walking total", "Push-up best set", "Walking streak", or plain "Streak". */
export function groupKindLabel(rules: GroupRules): string {
  if (isOpenStreak(rules)) {
    return MATCH_MODE_LABEL.days_completed;
  }

  return `${ACTIVITY_ADJECTIVE[rules.metric]} ${MATCH_MODE_LABEL[rules.scoringMode].toLowerCase()}`;
}

/** The word a group is called by before anyone else is in it: "Your walking group". */
export function groupNoun(rules: GroupRules): string {
  return isOpenStreak(rules) ? 'streak' : ACTIVITY_NOUN[rules.metric];
}

/** The rule as one line, the headline of the card your friends will see. */
export function groupRuleTitle(rules: GroupRules): string {
  if (rules.scoringMode === 'best_single') {
    return 'Most push-ups in one go wins.';
  }

  if (rules.scoringMode === 'cumulative_total') {
    return rules.metric === 'walk' ? 'Most minutes walked wins.' : 'Most push-ups in total wins.';
  }

  if (isOpenStreak(rules)) {
    return 'Most days showing up wins.';
  }

  return rules.metric === 'walk' ? 'Most days walked wins.' : 'Most days of push-ups wins.';
}

const DAILY_CAP_PHRASE: Record<MatchMetric, string> = {
  pushups: `up to ${MATCH_CUMULATIVE_DAILY_CAP_BY_METRIC.pushups} a day`,
  walk: 'up to two hours a day',
};

/** What counts, in the words of what the member already does. Nothing extra to log. */
export function groupRuleBody(rules: GroupRules): string {
  if (rules.scoringMode === 'best_single') {
    return 'Your best single set counts. The lead can change until time runs out.';
  }

  if (rules.scoringMode === 'cumulative_total') {
    const counted = rules.metric === 'walk' ? 'Every walk you already track' : 'Every set you do';
    return `${counted} counts, ${DAILY_CAP_PHRASE[rules.metric]}.`;
  }

  if (isOpenStreak(rules)) {
    return 'Any daily challenge you finish earns the day. Nothing extra to log.';
  }

  return `Finishing a ${ACTIVITY_NOUN[rules.metric]} challenge earns the day. Nothing extra to log.`;
}

/** One line per way to win in the sheet, written for the activity already picked. */
export function scoringModeHint(scoringMode: MatchScoringMode, rules: GroupRules): string {
  if (scoringMode === 'best_single') {
    return 'Most push-ups in one go. Push-ups only.';
  }

  if (scoringMode === 'cumulative_total') {
    const unit = rules.metric === 'walk' ? 'Every minute' : 'Every set';
    return `${unit} adds up, capped ${DAILY_CAP_PHRASE[rules.metric]} so nobody overdoes it.`;
  }

  if (isOpenStreak(rules)) {
    return 'One point for each day you finish a challenge. Most days wins.';
  }

  const verb = rules.metric === 'walk' ? 'walk' : 'do push-ups';
  return `One point for each day you ${verb}. Most days wins.`;
}

/** The note beside today's faces: "3 of 5 walked". */
export function todayTallyLabel(rules: GroupRules, done: number, total: number): string {
  const verb =
    rules.scoringMode !== 'days_completed' && rules.metric === 'walk' ? 'walked' : 'done';
  return `${done} of ${total} ${verb}`;
}

/** Why a face is dim, without saying what anyone is managing. */
export function notDoneYetLine(rules: GroupRules, name: string): string {
  if (isOpenStreak(rules)) {
    return `${name} hasn’t finished a challenge yet today.`;
  }

  return rules.metric === 'walk'
    ? `No walk from ${name} yet today.`
    : `No push-ups from ${name} yet today.`;
}

/** What the rest of the group will see of you, said before you join. */
export function sharedWithGroupLine(rules: GroupRules): string {
  if (rules.scoringMode === 'days_completed') {
    return 'Others see your name and how many days you’ve done. Nothing else.';
  }

  const measure = rules.metric === 'walk' ? 'minutes walked' : 'push-ups';
  return `Others see your name and ${measure}. Nothing else.`;
}
