import { z } from 'zod';

export const MATCH_PARTICIPANT_CAP = 8;

export const matchMetricSchema = z.enum(['pushups', 'walk']);
export const matchScoringModeSchema = z.enum([
  'best_single',
  'cumulative_total',
  'days_completed',
]);
/**
 * How an attempt was captured. Bound to the metric rather than trusted from
 * the client: a walk logged into a push-up contest is not a slow walk, it is a
 * forged score.
 */
export const matchAttemptSourceSchema = z.enum(['in_app_pose', 'in_app_walk']);
/**
 * Which finished days a streak counts. `any_challenge` keeps a board open to
 * whatever each member is managing, so people with different routines can
 * still compete on showing up; `chosen_activity` narrows it to the contest's
 * own activity, for a group that wants to race one habit.
 *
 * Only read under `days_completed`. Every other mode counts its metric by
 * definition, so a scope there would be a second name for the same fact.
 */
export const matchDailyScopeSchema = z.enum([
  'any_challenge',
  'chosen_activity',
]);
export const matchStatusSchema = z.enum(['open', 'completed', 'cancelled']);
export const matchWindowSchema = z.enum(['today', 'week', 'month']);

export const MATCH_LENGTH_MIN_DAYS = 1;
/**
 * A year is the ceiling. Contests settle lazily on read, so a longer one is
 * not a contest anyone finishes — it is a group with no ending, which is the
 * shape social here deliberately does not have.
 */
export const MATCH_LENGTH_MAX_DAYS = 365;

export const matchDurationDaysSchema = z
  .number()
  .int()
  .min(MATCH_LENGTH_MIN_DAYS)
  .max(MATCH_LENGTH_MAX_DAYS);

export const matchInviteTokenSchema = z
  .string()
  .min(8)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/);

export const matchStandingSchema = z.object({
  userId: z.string().min(1),
  displayName: z.string().min(1),
  /**
   * Profile photo URL (or data URL) from `User.image`. Null/absent when they
   * have not set one — clients fall back to initials, same as ProfileAvatar.
   * Optional so store clients and older API builds stay compatible.
   */
  image: z.string().min(1).nullable().optional(),
  rank: z.number().int().positive(),
  /**
   * The member's score under the contest's `scoringMode` — reps in their best
   * set, reps across the window, or days completed.
   */
  score: z.number().int().nonnegative(),
  /**
   * @deprecated Named for `best_single`, the only mode that existed when the
   * board shipped. Mirrors `score`; drop once store builds predating scoring
   * modes are gone.
   */
  bestCount: z.number().int().nonnegative(),
  isYou: z.boolean(),
  isHost: z.boolean(),
  /**
   * Seated from a crew but has not opened the contest yet. Pending members
   * hold a seat and show greyed; they are never scored or nudged until they
   * accept, so being added is not the same as agreeing to play.
   */
  isPending: z.boolean(),
});

/**
 * A score means nothing without its mode, so the unit is derived from the mode
 * rather than sent alongside it. Two sources for one fact is how a board starts
 * disagreeing with itself.
 */
export function matchScoreUnit(scoringMode: MatchScoringMode): string {
  if (scoringMode === 'cumulative_total') {
    return 'total';
  }

  if (scoringMode === 'days_completed') {
    return 'days';
  }

  return 'best';
}

/**
 * Which modes read sensibly on each metric.
 *
 * A walk has no `best_single`: "longest single walk wins" is the one shape
 * that rewards pushing past your limit in a single session, which is the wrong
 * pull in an app people use to manage chronic conditions. Total minutes and
 * days shown up both reward returning instead.
 */
export const MATCH_MODES_BY_METRIC = {
  pushups: ['best_single', 'cumulative_total', 'days_completed'],
  walk: ['cumulative_total', 'days_completed'],
} as const satisfies Record<MatchMetric, readonly MatchScoringMode[]>;

export function isScoringModeAllowedForMetric(
  metric: MatchMetric,
  scoringMode: MatchScoringMode,
): boolean {
  const allowed: readonly MatchScoringMode[] = MATCH_MODES_BY_METRIC[metric];
  return allowed.includes(scoringMode);
}

/**
 * Ceiling on what one local day can add to a `cumulative_total` score. Volume
 * modes otherwise reward grinding a single session, which is the wrong pull for
 * an app used to manage chronic conditions. Constants, not host settings — a
 * safety floor is not a preference.
 *
 * Push-ups are capped in reps, walks in minutes: two hours of walking in a day
 * is already a lot, and a contest should not ask for the third.
 */
export const MATCH_CUMULATIVE_DAILY_CAP_BY_METRIC = {
  pushups: 300,
  walk: 120,
} as const satisfies Record<MatchMetric, number>;

/**
 * @deprecated Named before walks existed, when one cap covered every contest.
 * Mirrors the push-up cap; read
 * `MATCH_CUMULATIVE_DAILY_CAP_BY_METRIC[metric]` instead.
 */
export const MATCH_CUMULATIVE_DAILY_CAP =
  MATCH_CUMULATIVE_DAILY_CAP_BY_METRIC.pushups;

/**
 * The largest single attempt each metric will accept. Bounds a competitive
 * score at the boundary so one absurd submission cannot win a contest.
 */
export const MATCH_ATTEMPT_MAX_BY_METRIC = {
  pushups: 2_000,
  /** Minutes. A walk cannot outlast the day it happened in. */
  walk: 1_440,
} as const satisfies Record<MatchMetric, number>;

/** The only capture each metric trusts. */
export const MATCH_ATTEMPT_SOURCE_BY_METRIC = {
  pushups: 'in_app_pose',
  walk: 'in_app_walk',
} as const satisfies Record<MatchMetric, MatchAttemptSource>;

/**
 * How long a contest runs. `today` is calendar-bounded — it ends at the host's
 * next local midnight, however much of the day is left — while every other
 * length is a span of whole days from the moment it starts.
 */
export type MatchLength =
  | { kind: 'today' }
  | { kind: 'days'; days: number };

/** The presets, as day counts. `today` is a partial day, counted as one. */
export const MATCH_PRESET_DAYS = {
  today: 1,
  week: 7,
  month: 30,
} as const satisfies Record<MatchWindow, number>;

export function matchWindowLength(window: MatchWindow): MatchLength {
  if (window === 'today') {
    return { kind: 'today' };
  }

  return { kind: 'days', days: MATCH_PRESET_DAYS[window] };
}

export function matchLengthDays(length: MatchLength): number {
  return length.kind === 'today' ? MATCH_PRESET_DAYS.today : length.days;
}

/**
 * The shortest contest each mode can run. A one-day consistency contest is not
 * a contest, so `days_completed` needs two; the attempt-driven modes read fine
 * over a single day.
 */
export const MATCH_MIN_DAYS_BY_SCORING_MODE = {
  best_single: 1,
  cumulative_total: 1,
  days_completed: 2,
} as const satisfies Record<MatchScoringMode, number>;

export function isLengthAllowedForScoringMode(
  scoringMode: MatchScoringMode,
  length: MatchLength,
): boolean {
  return matchLengthDays(length) >= MATCH_MIN_DAYS_BY_SCORING_MODE[scoringMode];
}

function presetsForScoringMode(
  scoringMode: MatchScoringMode,
): readonly MatchWindow[] {
  return matchWindowSchema.options.filter((window) =>
    isLengthAllowedForScoringMode(scoringMode, matchWindowLength(window)),
  );
}

/**
 * The presets the create screen offers per mode, derived from the minimum so
 * the shortcut row cannot drift from the rule custom lengths are checked
 * against.
 */
export const MATCH_WINDOWS_BY_SCORING_MODE = {
  best_single: presetsForScoringMode('best_single'),
  cumulative_total: presetsForScoringMode('cumulative_total'),
  days_completed: presetsForScoringMode('days_completed'),
} as const satisfies Record<MatchScoringMode, readonly MatchWindow[]>;

export function isWindowAllowedForScoringMode(
  scoringMode: MatchScoringMode,
  window: MatchWindow,
): boolean {
  return isLengthAllowedForScoringMode(scoringMode, matchWindowLength(window));
}

/**
 * The single place that turns what a client sent into a length. A preset and a
 * day count are alternatives — the contract rejects both together — so there
 * is no precedence rule for a reader to carry around.
 */
export function resolveMatchLength(input: {
  window?: MatchWindow | undefined;
  durationDays?: number | undefined;
}): MatchLength {
  if (input.durationDays !== undefined) {
    return { kind: 'days', days: input.durationDays };
  }

  // Validation has already rejected a request carrying neither; falling back
  // to the shortest contest keeps this total without inventing a long one.
  return matchWindowLength(input.window ?? 'today');
}

/**
 * Invites are `https` so a recipient without the app lands on a real page
 * instead of a dead custom scheme. The path matches the app's `/match/[token]`
 * route, so the universal link resolves without extra linking config.
 *
 * The origin is a parameter because only the server knows which deployment it
 * is serving; clients read the finished URL off the board.
 */
export function matchInviteUrl(origin: string, token: string): string {
  return `${origin.replace(/\/+$/, '')}/match/${token}`;
}

/** Viewer-relative label so two push-up contests do not look identical. */
export function matchContestTitle(opponentNames: string[]): string {
  if (opponentNames.length === 0) {
    return 'Waiting for a friend';
  }

  if (opponentNames.length === 1) {
    return `vs ${opponentNames[0]}`;
  }

  if (opponentNames.length === 2) {
    return `vs ${opponentNames[0]} and ${opponentNames[1]}`;
  }

  return `vs ${opponentNames[0]} +${opponentNames.length - 1}`;
}

export type MatchMetric = z.infer<typeof matchMetricSchema>;
export type MatchScoringMode = z.infer<typeof matchScoringModeSchema>;
export type MatchAttemptSource = z.infer<typeof matchAttemptSourceSchema>;
export type MatchDailyScope = z.infer<typeof matchDailyScopeSchema>;
export type MatchStatus = z.infer<typeof matchStatusSchema>;
export type MatchWindow = z.infer<typeof matchWindowSchema>;
export type MatchStanding = z.infer<typeof matchStandingSchema>;
