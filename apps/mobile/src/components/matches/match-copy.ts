import {
  MATCH_PARTICIPANT_CAP,
  matchLengthDays,
  type MatchDailyScope,
  type MatchLength,
  type MatchMetric,
  type MatchScoringMode,
} from '@product/contract/match-board';
import type { WalkPhase } from '@/components/challenges/walk-session-copy';
import { formatDuration } from '@/lib/geo-session';

/**
 * What the host is choosing between. Plain language, never the enum name — the
 * rule sentence below is what stops three options reading as configuration.
 */
export const MATCH_MODE_LABEL: Record<MatchScoringMode, string> = {
  best_single: 'Best set',
  cumulative_total: 'Total',
  days_completed: 'Streak',
};

export const MATCH_MODE_HINT: Record<MatchScoringMode, string> = {
  best_single: 'Most in one go',
  cumulative_total: 'Most added up',
  days_completed: 'Most days done',
};

const MODE_RULE: Record<MatchScoringMode, string> = {
  best_single:
    'Highest single set wins. The lead can change until time runs out.',
  cumulative_total:
    'Every set adds up. Highest total when time runs out wins.',
  days_completed:
    'One point for each day you finish a challenge. Most days wins.',
};

/**
 * A best set is push-ups by definition, so only the total and the streak
 * change with the activity.
 */
const TOTAL_RULE: Record<MatchMetric, string> = {
  pushups: MODE_RULE.cumulative_total,
  walk: 'Every minute walked adds up. Most minutes when time runs out wins.',
};

/** A streak narrowed to one activity earns its day from that challenge only. */
const STREAK_RULE: Record<MatchMetric, string> = {
  pushups: 'One point for each day you finish a push-up challenge. Most days wins.',
  walk: 'One point for each day you finish a walking challenge. Most days wins.',
};

export function matchModeRule(
  scoringMode: MatchScoringMode,
  metric: MatchMetric,
  dailyScope: MatchDailyScope,
): string {
  if (scoringMode === 'cumulative_total') {
    return TOTAL_RULE[metric];
  }

  if (scoringMode === 'days_completed' && dailyScope === 'chosen_activity') {
    return STREAK_RULE[metric];
  }

  return MODE_RULE[scoringMode];
}

/** The activity as an adjective, for naming the contest in a sentence. */
const ACTIVITY_WORD: Record<MatchMetric, string> = {
  pushups: 'push-up',
  walk: 'walking',
};

function contestPhrase(
  scoringMode: MatchScoringMode,
  metric: MatchMetric,
  dailyScope: MatchDailyScope,
): string {
  if (scoringMode !== 'days_completed') {
    return `${ACTIVITY_WORD[metric]} contest`;
  }

  return dailyScope === 'chosen_activity'
    ? `${ACTIVITY_WORD[metric]} streak`
    : 'streak';
}

/**
 * The whole form in one paragraph, rewritten as the host picks. It carries the
 * explanation the option tiles used to repeat one hint at a time, which is
 * what lets the choices themselves stay bare labels.
 */
export function matchSetupSummary(
  length: MatchLength,
  scoringMode: MatchScoringMode,
  metric: MatchMetric,
  dailyScope: MatchDailyScope,
): string {
  const days = matchLengthDays(length);
  const lengthWord = days === 1 ? 'one' : String(days);
  const phrase = contestPhrase(scoringMode, metric, dailyScope);

  return `A ${lengthWord}-day ${phrase}. ${matchModeRule(scoringMode, metric, dailyScope)}`;
}

export const MATCH_ACTIVITY = 'Activity';
export const MATCH_WHAT_COUNTS = 'What counts';
export const MATCH_WHOS_IN = "Who's in";
export const MATCH_NEW_GROUP = 'New group';
/** Shown against a crew-seated member until they open the contest. */
export const MATCH_PENDING = 'Invited';
export const MATCH_SAVE_CREW = 'Save this crew';
export const MATCH_CREW_SAVED = 'Saved';
export const MATCH_CREW_SAVE_FAILED = 'We could not save that crew. Try again.';
export const MATCH_LOAD_FAILED = 'We could not load this group.';
export const MATCH_CANCEL_FAILED = 'We could not cancel this group.';
export const MATCH_CREATE_TITLE = 'Start a group';
export const MATCH_CREATE_CTA = 'Create and share';
/** No link to hand out when a saved crew is already seated. */
export const MATCH_CREATE_CTA_CREW = 'Start with this crew';
/**
 * The empty list is the whole feature's front door, so it teaches the loop
 * instead of announcing a count of zero. Nothing here names an activity: a
 * group is defined by the challenge its host picks, and that set grows.
 */
export const MATCH_EMPTY_TITLE = 'Turn a challenge into a contest';
export const MATCH_EMPTY_BODY =
  'Scores come from what you already log, so there is nothing extra to track.';
export const MATCH_EMPTY_STEPS: readonly { title: string; hint: string }[] = [
  { title: 'Pick what counts', hint: 'Best set, total, or days done' },
  {
    title: 'Send one link',
    hint: `Up to ${MATCH_PARTICIPANT_CAP} people, no usernames to hunt for`,
  },
  { title: 'Play it out', hint: 'Standings move as everyone logs' },
];
export const MATCH_SHARE_LINK = 'Share link';
/**
 * A contest of one is not a board yet. Ranking the host against themselves
 * dresses an empty room as a game, so the solo state sells the invite and
 * keeps the score as a plain line until somebody else is in.
 */
export const MATCH_WAITING_TITLE = 'Nobody has joined yet';
export const MATCH_WAITING_BODY = `Send the link and the board fills as they log. Up to ${MATCH_PARTICIPANT_CAP} people can play.`;
/** The same message as one quiet line, for when a logged score owns the hero. */
export const MATCH_WAITING_NOTE = `${MATCH_WAITING_TITLE}. ${MATCH_WAITING_BODY}`;
export const MATCH_ACCEPT = 'Accept';
export const MATCH_NOT_NOW = 'Not now';
export const MATCH_JOIN_ENDED = 'This group has ended.';
export const MATCH_JOIN_FULL = 'This group is full.';
export const MATCH_JOIN_IN = 'You are already in this group.';
export const MATCH_WINDOW_TODAY = 'Today';
export const MATCH_WINDOW_WEEK = '7 days';
export const MATCH_WINDOW_MONTH = '30 days';
/** The shortcuts cover the common cases; a season or a rehab block needs more. */
export const MATCH_WINDOW_CUSTOM = 'Something else';
export const MATCH_CUSTOM_DAYS_UNIT = 'days';
export const MATCH_CUSTOM_DAYS_FEWER = 'Fewer days';
export const MATCH_CUSTOM_DAYS_MORE = 'More days';
/**
 * The board counts whole minutes, so a thirty second lap would round to zero
 * and read as a bug. Saying the floor up front beats logging nothing.
 */
export const MATCH_WALK_MIN_SECONDS = 60;
export const MATCH_WALK_TITLE = 'Walk';
export const MATCH_WALK_START = 'Start walk';
export const MATCH_WALK_STOP = 'Stop';
export const MATCH_WALK_LOG = 'Add to the board';
export const MATCH_WALK_RESUME = 'Keep walking';
export const MATCH_WALK_TOO_SHORT =
  'A walk has to run a minute before it counts. Keep going and stop again.';
export const MATCH_WALK_FAILED = 'We could not add that walk. Try again.';

/** The floor, said while there is still time to walk past it. */
const MATCH_WALK_MIN_READOUT = formatDuration(MATCH_WALK_MIN_SECONDS);

/**
 * The challenge walk borrows its wording from a goal it has to reach. A
 * contest walk has none — you bank whatever you do — so the card says what is
 * being counted rather than how far off the finish is.
 *
 * The one exception is the floor: a walk under a minute scores nothing, and
 * finding that out only after stopping is how a real walk gets thrown away.
 * So the card names the floor until the walker is past it.
 */
export function matchWalkStatus({
  phase,
  autoPaused,
  countsYet,
  saving,
  tooShort,
}: {
  phase: WalkPhase;
  autoPaused: boolean;
  /** Whether the clock has already passed the floor. */
  countsYet: boolean;
  saving: boolean;
  tooShort: boolean;
}): { eyebrow: string; meta: string } {
  if (phase === 'idle') {
    return {
      eyebrow: 'Ready',
      meta: `Walks count from ${MATCH_WALK_MIN_READOUT}. Stop and yours goes on the board.`,
    };
  }

  if (phase === 'recording') {
    if (autoPaused) {
      return {
        eyebrow: 'Paused',
        meta: 'Paused while you stand still. Walk on and the clock picks up.',
      };
    }

    return countsYet
      ? { eyebrow: 'Walking', meta: 'Stop now and these minutes go on the board.' }
      : {
          eyebrow: 'Walking',
          meta: `Nothing counts until ${MATCH_WALK_MIN_READOUT}. Keep going.`,
        };
  }

  if (saving) {
    return { eyebrow: 'Adding', meta: 'Putting this walk on the board.' };
  }

  if (tooShort) {
    return { eyebrow: 'Too short', meta: MATCH_WALK_TOO_SHORT };
  }

  return { eyebrow: 'Walk done', meta: 'Add it to the board below.' };
}

export const MATCH_KICKER = 'Private contest';
export const MATCH_INVITE_KICKER = 'Invite';
export const MATCH_YOUR_SCORE_LABEL: Record<MatchScoringMode, string> = {
  best_single: 'Your best',
  cumulative_total: 'Your total',
  days_completed: 'Your days',
};
export const MATCH_STANDINGS = 'Standings';
export const MATCH_HOW_LONG = 'How long';
export const MATCH_OPEN_BOARD = 'Open group';
export const MATCH_HOME_SECTION = 'Groups';

/** Home names the live count, so the plural belongs with the rest of the copy. */
export function matchLiveCountLabel(liveCount: number): string {
  return liveCount === 1 ? '1 live group' : `${liveCount} live groups`;
}
export const MATCH_LIVE = 'Live';
export const MATCH_ENDED_LABEL = 'Ended';
export const MATCH_CANCELLED = 'Cancelled';
export const MATCH_CANCEL = 'Cancel group';
export const MATCH_CANCEL_KEEP = 'Keep it';
export const MATCH_CANCEL_CONFIRM_TITLE = 'Cancel this group?';
export const MATCH_CANCEL_CONFIRM_BODY =
  'The contest stops. Scores already logged stay on the board.';
export const MATCH_CANCELLED_BANNER = 'This group was cancelled.';
export const MATCH_LIVE_HINT = 'See where you stand';
