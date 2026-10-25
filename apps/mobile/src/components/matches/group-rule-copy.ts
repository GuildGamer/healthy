import type { MatchDailyScope, MatchMetric, MatchScoringMode } from '@product/client';
import { MATCH_CUMULATIVE_DAILY_CAP_BY_METRIC, MATCH_METRIC_MEASURE } from '@product/contract/match-board';
import { MATCH_MODE_LABEL } from './match-copy';
import { MATCH_METRIC_UNIT } from './match-metric';

/** The three facts that decide how a group is won, as every screen reads them. */
export type GroupRules = {
  scoringMode: MatchScoringMode;
  metric: MatchMetric;
  dailyScope: MatchDailyScope;
};

const ACTIVITY_ADJECTIVE: Record<MatchMetric, string> = {
  pushups: 'Push-up',
  walk: 'Walking',
  squats: 'Squat',
  plank: 'Plank',
  jumping_jacks: 'Jumping-jack',
  burpees: 'Burpee',
  sit_ups: 'Sit-up',
  mountain_climbers: 'Mountain-climber',
  lunges: 'Lunge',
};

const ACTIVITY_NOUN: Record<MatchMetric, string> = {
  pushups: 'push-up',
  walk: 'walking',
  squats: 'squat',
  plank: 'plank',
  jumping_jacks: 'jumping-jack',
  burpees: 'burpee',
  sit_ups: 'sit-up',
  mountain_climbers: 'mountain-climber',
  lunges: 'lunge',
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
    if (MATCH_METRIC_MEASURE[rules.metric] === 'seconds') {
      return 'Longest hold wins.';
    }
    return `Most ${MATCH_METRIC_UNIT[rules.metric]} in one go wins.`;
  }

  if (rules.scoringMode === 'cumulative_total') {
    if (rules.metric === 'walk') {
      return 'Most minutes walked wins.';
    }
    if (MATCH_METRIC_MEASURE[rules.metric] === 'seconds') {
      return 'Most seconds held wins.';
    }
    return `Most ${MATCH_METRIC_UNIT[rules.metric]} in total wins.`;
  }

  if (isOpenStreak(rules)) {
    return 'Most days showing up wins.';
  }

  if (rules.metric === 'walk') {
    return 'Most days walked wins.';
  }

  return `Most days of ${MATCH_METRIC_UNIT[rules.metric]} wins.`;
}

const DAILY_CAP_PHRASE: Record<MatchMetric, string> = {
  pushups: `up to ${MATCH_CUMULATIVE_DAILY_CAP_BY_METRIC.pushups} a day`,
  walk: 'up to two hours a day',
  squats: `up to ${MATCH_CUMULATIVE_DAILY_CAP_BY_METRIC.squats} a day`,
  plank: `up to ${MATCH_CUMULATIVE_DAILY_CAP_BY_METRIC.plank} seconds a day`,
  jumping_jacks: `up to ${MATCH_CUMULATIVE_DAILY_CAP_BY_METRIC.jumping_jacks} a day`,
  burpees: `up to ${MATCH_CUMULATIVE_DAILY_CAP_BY_METRIC.burpees} a day`,
  sit_ups: `up to ${MATCH_CUMULATIVE_DAILY_CAP_BY_METRIC.sit_ups} a day`,
  mountain_climbers: `up to ${MATCH_CUMULATIVE_DAILY_CAP_BY_METRIC.mountain_climbers} a day`,
  lunges: `up to ${MATCH_CUMULATIVE_DAILY_CAP_BY_METRIC.lunges} a day`,
};

/** What counts, in the words of what the member already does. Nothing extra to log. */
export function groupRuleBody(rules: GroupRules): string {
  if (rules.scoringMode === 'best_single') {
    return MATCH_METRIC_MEASURE[rules.metric] === 'seconds'
      ? 'Your longest single hold counts. The lead can change until time runs out.'
      : 'Your best single set counts. The lead can change until time runs out.';
  }

  if (rules.scoringMode === 'cumulative_total') {
    const counted =
      rules.metric === 'walk'
        ? 'Every walk you already track'
        : MATCH_METRIC_MEASURE[rules.metric] === 'seconds'
          ? 'Every hold you do'
          : 'Every set you do';
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
    if (MATCH_METRIC_MEASURE[rules.metric] === 'seconds') {
      return 'Longest hold in one go. Plank only.';
    }
    return `Most ${MATCH_METRIC_UNIT[rules.metric]} in one go.`;
  }

  if (scoringMode === 'cumulative_total') {
    const unit =
      rules.metric === 'walk'
        ? 'Every minute'
        : MATCH_METRIC_MEASURE[rules.metric] === 'seconds'
          ? 'Every second'
          : 'Every set';
    return `${unit} adds up, capped ${DAILY_CAP_PHRASE[rules.metric]} so nobody overdoes it.`;
  }

  if (isOpenStreak(rules)) {
    return 'One point for each day you finish a challenge. Most days wins.';
  }

  const verb = rules.metric === 'walk' ? 'walk' : `do ${MATCH_METRIC_UNIT[rules.metric]}`;
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

  if (rules.metric === 'walk') {
    return `No walk from ${name} yet today.`;
  }

  return `No ${MATCH_METRIC_UNIT[rules.metric]} from ${name} yet today.`;
}

/** What the rest of the group will see of you, said before you join. */
export function sharedWithGroupLine(rules: GroupRules): string {
  if (rules.scoringMode === 'days_completed') {
    return 'Others see your name and how many days you’ve done. Nothing else.';
  }

  const measure =
    rules.metric === 'walk'
      ? 'minutes walked'
      : MATCH_METRIC_MEASURE[rules.metric] === 'seconds'
        ? 'seconds held'
        : MATCH_METRIC_UNIT[rules.metric];
  return `Others see your name and ${measure}. Nothing else.`;
}
