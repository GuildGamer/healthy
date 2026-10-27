import type { MatchDailyScope, MatchMetric, MatchScoringMode } from '@product/client';
import {
  MATCH_METRIC_MEASURE,
  MATCH_MODES_BY_METRIC,
  formatMatchMetricScore,
  isPoseMetric,
  isScoringModeAllowedForMetric,
} from '@product/contract/match-board';
import type { ChallengeIconName } from '@/components/challenges/challenge-icon';
import { PUSHUP_ICON_NAME, WALK_ICON_NAME } from '@/components/challenges/challenge-icon';

/**
 * Everything a screen needs to name, draw, and run the activity a group is
 * scored on. One place so a third activity is a column of entries here rather
 * than a hunt through five screens for hardcoded strings.
 */
export const MATCH_METRIC_LABEL: Record<MatchMetric, string> = {
  pushups: 'Push-ups',
  walk: 'Walking',
  squats: 'Squats',
  plank: 'Plank',
  jumping_jacks: 'Jumping jacks',
  burpees: 'Burpees',
  sit_ups: 'Sit-ups',
  mountain_climbers: 'Mountain climbers',
  lunges: 'Lunges',
};

/** Lowercase, for a score that reads as a sentence: "42 push-ups". */
export const MATCH_METRIC_UNIT: Record<MatchMetric, string> = {
  pushups: 'push-ups',
  walk: 'minutes',
  squats: 'squats',
  plank: 'seconds',
  jumping_jacks: 'jumping jacks',
  burpees: 'burpees',
  sit_ups: 'sit-ups',
  mountain_climbers: 'mountain climbers',
  lunges: 'lunges',
};

const METRIC_UNIT_SINGULAR: Record<MatchMetric, string> = {
  pushups: 'push-up',
  walk: 'minute',
  squats: 'squat',
  plank: 'second',
  jumping_jacks: 'jumping jack',
  burpees: 'burpee',
  sit_ups: 'sit-up',
  mountain_climbers: 'mountain climber',
  lunges: 'lunge',
};

/**
 * What a score is counted in. Days are the unit under a consistency contest
 * whatever the activity was; everything else counts the metric itself.
 */
export function matchScoreUnitFor(
  scoringMode: MatchScoringMode,
  metric: MatchMetric,
  score: number,
): string {
  if (scoringMode === 'days_completed') {
    return score === 1 ? 'day' : 'days';
  }

  return score === 1 ? METRIC_UNIT_SINGULAR[metric] : MATCH_METRIC_UNIT[metric];
}

export const MATCH_METRIC_ICON: Record<MatchMetric, ChallengeIconName> = {
  pushups: PUSHUP_ICON_NAME,
  walk: WALK_ICON_NAME,
  squats: PUSHUP_ICON_NAME,
  plank: PUSHUP_ICON_NAME,
  jumping_jacks: PUSHUP_ICON_NAME,
  burpees: PUSHUP_ICON_NAME,
  sit_ups: PUSHUP_ICON_NAME,
  mountain_climbers: PUSHUP_ICON_NAME,
  lunges: PUSHUP_ICON_NAME,
};

/** The session route under `/matches/[matchId]/` that logs this activity. */
export type MatchSessionRoute = 'pose' | 'walk';

const SESSION_ROUTE: Record<MatchMetric, MatchSessionRoute> = {
  pushups: 'pose',
  walk: 'walk',
  squats: 'pose',
  plank: 'pose',
  jumping_jacks: 'pose',
  burpees: 'pose',
  sit_ups: 'pose',
  mountain_climbers: 'pose',
  lunges: 'pose',
};

const SESSION_CTA: Record<MatchMetric, string> = {
  pushups: 'Do a set',
  walk: 'Start a walk',
  squats: 'Do squats',
  plank: 'Hold a plank',
  jumping_jacks: 'Do jumping jacks',
  burpees: 'Do burpees',
  sit_ups: 'Do sit-ups',
  mountain_climbers: 'Do mountain climbers',
  lunges: 'Do lunges',
};

/** Kicker on the success card, which should name what was just banked. */
export const MATCH_LOGGED_KICKER: Record<MatchMetric, string> = {
  pushups: 'Group set',
  walk: 'Group walk',
  squats: 'Group set',
  plank: 'Group hold',
  jumping_jacks: 'Group set',
  burpees: 'Group set',
  sit_ups: 'Group set',
  mountain_climbers: 'Group set',
  lunges: 'Group set',
};

/** Pose metrics offered on the create screen, push-ups first. */
export const MATCH_POSE_METRICS = [
  'pushups',
  'squats',
  'plank',
  'jumping_jacks',
  'burpees',
  'sit_ups',
  'mountain_climbers',
  'lunges',
] as const satisfies readonly MatchMetric[];

/** What the create screen starts on, and the safe assumption for old data. */
export const MATCH_DEFAULT_METRIC: MatchMetric = 'pushups';

/**
 * A streak can score any daily challenge the member finishes. That stays the
 * default; a host who wants a one-habit race narrows it to an activity.
 */
export const MATCH_ANY_DAILY_LABEL = 'Any daily challenge';
const ANY_DAILY_ICON: ChallengeIconName = 'calendar-check';

/**
 * What the host picks under Activity. An open streak is a choice of its own
 * rather than a metric, because no metric describes it.
 */
export type MatchActivityChoice = MatchMetric | 'any_daily';

export const MATCH_ANY_DAILY_CHOICE = 'any_daily' satisfies MatchActivityChoice;

/**
 * The pair the API wants for a choice. An open streak still carries a metric,
 * which it never reads; the other modes carry the default scope, for the same
 * reason in reverse.
 */
export function matchActivityInput(
  choice: MatchActivityChoice,
  scoringMode: MatchScoringMode,
): { metric: MatchMetric; dailyScope: MatchDailyScope } {
  if (choice === MATCH_ANY_DAILY_CHOICE) {
    return { metric: MATCH_DEFAULT_METRIC, dailyScope: 'any_challenge' };
  }

  const narrowed = scoringMode === 'days_completed';
  return {
    metric: choice,
    dailyScope: narrowed ? 'chosen_activity' : 'any_challenge',
  };
}

/**
 * Only a streak can be open to everything, so leaving that mode has to land
 * back on an activity rather than send a choice the other modes cannot score.
 */
export function activityChoiceForMode(
  scoringMode: MatchScoringMode,
  current: MatchActivityChoice,
): MatchActivityChoice {
  if (scoringMode === 'days_completed') {
    return MATCH_ANY_DAILY_CHOICE;
  }

  return current === MATCH_ANY_DAILY_CHOICE ? MATCH_DEFAULT_METRIC : current;
}

/** What a contest is actually about, which is not always its metric. */
export interface MatchActivity {
  label: string;
  icon: ChallengeIconName;
}

/**
 * A walk cannot be a "best set" contest, so switching activity can outlaw the
 * mode already picked. Falls back to the first mode the activity does run
 * rather than sending a pair the API will reject.
 */
export function legalScoringModeFor(
  metric: MatchMetric,
  scoringMode: MatchScoringMode,
): MatchScoringMode {
  if (isScoringModeAllowedForMetric(metric, scoringMode)) {
    return scoringMode;
  }

  return MATCH_MODES_BY_METRIC[metric][0];
}

export function matchActivity(
  scoringMode: MatchScoringMode,
  metric: MatchMetric,
  dailyScope: MatchDailyScope,
): MatchActivity {
  if (scoringMode === 'days_completed' && dailyScope === 'any_challenge') {
    return { label: MATCH_ANY_DAILY_LABEL, icon: ANY_DAILY_ICON };
  }

  return { label: MATCH_METRIC_LABEL[metric], icon: MATCH_METRIC_ICON[metric] };
}

/** The board's one button: what it says, and where it goes. */
export interface MatchBoardAction {
  label: string;
  /** `null` leaves the contest, because no session here would score. */
  session: MatchSessionRoute | null;
}

export const MATCH_STREAK_CTA = 'Open today’s challenges';

/**
 * A streak is scored from finished daily occurrences, so a set logged against
 * the contest moves nothing. Its button has to send people to the challenges
 * that do count instead of offering a session that quietly does nothing.
 */
export function matchBoardAction(
  scoringMode: MatchScoringMode,
  metric: MatchMetric,
): MatchBoardAction {
  if (scoringMode === 'days_completed') {
    return { label: MATCH_STREAK_CTA, session: null };
  }

  return { label: SESSION_CTA[metric], session: SESSION_ROUTE[metric] };
}

export function isHoldMetric(metric: MatchMetric): boolean {
  return MATCH_METRIC_MEASURE[metric] === 'seconds';
}

/**
 * How a score reads on the board. Holds use m:ss with no unit suffix;
 * streaks and reps keep a number plus unit.
 */
export function formatBoardScore(
  scoringMode: MatchScoringMode,
  metric: MatchMetric,
  score: number,
): { value: string; unit: string } {
  if (scoringMode === 'days_completed') {
    return {
      value: String(score),
      unit: matchScoreUnitFor(scoringMode, metric, score),
    };
  }

  if (isHoldMetric(metric)) {
    return { value: formatMatchMetricScore(metric, score), unit: '' };
  }

  return {
    value: String(score),
    unit: matchScoreUnitFor(scoringMode, metric, score),
  };
}

export { isPoseMetric, formatMatchMetricScore };
