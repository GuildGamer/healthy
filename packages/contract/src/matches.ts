import { oc } from '@orpc/contract';
import { z } from 'zod';
import {
  isLengthAllowedForScoringMode,
  isScoringModeAllowedForMetric,
  matchAttemptSourceSchema,
  matchDailyScopeSchema,
  matchDurationDaysSchema,
  matchInviteTokenSchema,
  matchMetricSchema,
  matchScoringModeSchema,
  matchStandingSchema,
  matchStatusSchema,
  matchWindowSchema,
  resolveMatchLength,
} from './match-board.js';

// The pure half lives in ./match-board so clients can import the link and
// label helpers without pulling the oRPC contract runtime in with them.
export {
  MATCH_ATTEMPT_MAX_BY_METRIC,
  MATCH_ATTEMPT_SOURCE_BY_METRIC,
  MATCH_CUMULATIVE_DAILY_CAP,
  MATCH_CUMULATIVE_DAILY_CAP_BY_METRIC,
  MATCH_LENGTH_MAX_DAYS,
  MATCH_LENGTH_MIN_DAYS,
  MATCH_MIN_DAYS_BY_SCORING_MODE,
  MATCH_MODES_BY_METRIC,
  MATCH_PARTICIPANT_CAP,
  MATCH_PRESET_DAYS,
  MATCH_WINDOWS_BY_SCORING_MODE,
  isLengthAllowedForScoringMode,
  isScoringModeAllowedForMetric,
  isWindowAllowedForScoringMode,
  matchAttemptSourceSchema,
  matchContestTitle,
  matchDailyScopeSchema,
  matchDurationDaysSchema,
  matchInviteTokenSchema,
  matchInviteUrl,
  matchLengthDays,
  matchMetricSchema,
  matchScoreUnit,
  matchScoringModeSchema,
  matchStandingSchema,
  matchStatusSchema,
  matchWindowLength,
  matchWindowSchema,
  resolveMatchLength,
} from './match-board.js';
export type {
  MatchAttemptSource,
  MatchDailyScope,
  MatchLength,
} from './match-board.js';

export const createMatchInputSchema = z
  .object({
    /**
     * One of the shortcut lengths. Alternative to `durationDays` rather than a
     * companion to it: a contest has one length, so sending both is rejected
     * instead of silently resolved one way.
     */
    window: matchWindowSchema.optional(),
    /** A length the shortcuts do not cover, in whole days from the start. */
    durationDays: matchDurationDaysSchema.optional(),
    /** Older clients predate walks and always meant push-ups. */
    metric: matchMetricSchema.default('pushups'),
    /** Older clients predate scoring modes and always meant `best_single`. */
    scoringMode: matchScoringModeSchema.default('best_single'),
    /**
     * Only read under `days_completed`. The default is what every streak
     * counted before a host could narrow one.
     */
    dailyScope: matchDailyScopeSchema.default('any_challenge'),
    /**
     * Seats a saved roster instead of waiting on a link. Absent means the
     * host shares a link, which stays the default path.
     */
    crewId: z.string().min(1).optional(),
    /**
     * Habit occurrence that motivated this contest (distribution flywheel).
     * When set, the server may seed the host's first attempt from that
     * completion's verified count.
     */
    sourceUserChallengeId: z.string().min(1).optional(),
    /** Prior contest in a challenge chain (A → B → C). */
    parentMatchId: z.string().min(1).optional(),
    experimentId: z.string().min(1).optional(),
    experimentVariantKey: z.string().min(1).max(64).optional(),
    /**
     * Optional host score to bank immediately (e.g. reps just performed).
     * Preferred over deriving from `sourceUserChallengeId` when both are set.
     */
    seedCount: z.number().int().positive().max(200_000).optional(),
  })
  .superRefine((input, ctx) => {
    if (input.window !== undefined && input.durationDays !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Pick a preset length or a number of days, not both',
        path: ['durationDays'],
      });
      return;
    }

    if (input.window === undefined && input.durationDays === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A contest needs a length',
        path: ['window'],
      });
      return;
    }

    if (!isScoringModeAllowedForMetric(input.metric, input.scoringMode)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'That scoring mode is not available for this activity',
        path: ['scoringMode'],
      });
      return;
    }

    const length = resolveMatchLength(input);
    if (isLengthAllowedForScoringMode(input.scoringMode, length)) {
      return;
    }

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'That length is not available for this scoring mode',
      path: input.durationDays === undefined ? ['window'] : ['durationDays'],
    });
  });

export const matchBoardSchema = z.object({
  id: z.string().min(1),
  token: z.string().min(1),
  /**
   * The shareable `https` invite. Built server-side so no client has to know
   * which origin this deployment serves links from.
   */
  inviteUrl: z.string().url(),
  metric: matchMetricSchema,
  scoringMode: matchScoringModeSchema,
  /** Which finished days count. Only meaningful under `days_completed`. */
  dailyScope: matchDailyScopeSchema,
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  status: matchStatusSchema,
  participantCount: z.number().int().nonnegative(),
  participantCap: z.number().int().positive(),
  /** The caller's score under `scoringMode`. Unit comes from `matchScoreUnit`. */
  yourScore: z.number().int().nonnegative(),
  /** @deprecated Mirrors `yourScore`. See `matchStandingSchema.bestCount`. */
  yourBestCount: z.number().int().nonnegative(),
  winnerUserId: z.string().min(1).nullable(),
  standings: z.array(matchStandingSchema),
  /**
   * Whether to offer "Save this crew" to the viewer. Derived server-side: the
   * host of a finished contest that had other people in it and was not itself
   * seated from a crew.
   */
  canSaveCrew: z.boolean(),
});

export const matchInviteLinkSchema = z.object({
  token: z.string().min(1),
  url: z.string().min(1),
});

export const createMatchOutputSchema = z.object({
  match: matchBoardSchema,
  /** @deprecated Mirrors `match.token` and `match.inviteUrl`. */
  invite: matchInviteLinkSchema,
});

export const matchTokenInputSchema = z.object({
  token: matchInviteTokenSchema,
});

export const matchPreviewSchema = z.object({
  token: z.string().min(1),
  matchId: z.string().min(1),
  hostDisplayName: z.string().min(1),
  metric: matchMetricSchema,
  scoringMode: matchScoringModeSchema,
  dailyScope: matchDailyScopeSchema,
  endsAt: z.string().datetime(),
  participantCount: z.number().int().nonnegative(),
  participantCap: z.number().int().positive(),
  status: matchStatusSchema,
  alreadyJoined: z.boolean(),
  viewerIsHost: z.boolean(),
  /** Host's best attempt so far — the score to beat when present. */
  hostScore: z.number().int().nonnegative().nullable(),
  parentMatchId: z.string().min(1).nullable(),
  experimentId: z.string().min(1).nullable(),
  experimentVariantKey: z.string().min(1).nullable(),
});

/**
 * Public, rate-safe invite card for the marketing site / deferred install.
 * Intentionally omits private health data and match id enumeration aids beyond
 * the unguessable token.
 */
export const publicMatchInvitePreviewSchema = z.object({
  token: z.string().min(1),
  hostDisplayName: z.string().min(1),
  metric: matchMetricSchema,
  scoringMode: matchScoringModeSchema,
  hostScore: z.number().int().nonnegative().nullable(),
  status: matchStatusSchema,
  endsAt: z.string().datetime(),
});

export const matchIdInputSchema = z.object({
  matchId: z.string().min(1),
});

export const matchListItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  metric: matchMetricSchema,
  scoringMode: matchScoringModeSchema,
  dailyScope: matchDailyScopeSchema,
  endsAt: z.string().datetime(),
  status: matchStatusSchema,
  participantCount: z.number().int().nonnegative(),
  /** The caller's score under `scoringMode`. Unit comes from `matchScoreUnit`. */
  yourScore: z.number().int().nonnegative(),
  /** @deprecated Mirrors `yourScore`. See `matchStandingSchema.bestCount`. */
  yourBestCount: z.number().int().nonnegative(),
  yourRank: z.number().int().positive().nullable(),
});

export const listMyMatchesOutputSchema = z.object({
  live: z.array(matchListItemSchema),
  ended: z.array(matchListItemSchema),
});

export const submitMatchAttemptInputSchema = z.object({
  matchId: z.string().min(1),
  /** Reps for a push-up contest, minutes walked for a walk one. */
  count: z.number().int().positive().max(200_000),
  durationSeconds: z.number().int().nonnegative().max(86_400),
  /**
   * How the attempt was captured. The server checks it against the contest's
   * metric rather than taking the client's word for what was logged.
   */
  source: matchAttemptSourceSchema,
});

export const createMatchContract = oc
  .route({ method: 'POST', path: '/matches' })
  .input(createMatchInputSchema)
  .output(createMatchOutputSchema);

export const listMyMatchesContract = oc
  .route({ method: 'GET', path: '/matches' })
  .output(listMyMatchesOutputSchema);

export const previewMatchContract = oc
  .route({ method: 'GET', path: '/matches/invite' })
  .input(matchTokenInputSchema)
  .output(matchPreviewSchema);

export const publicPreviewMatchContract = oc
  .route({ method: 'GET', path: '/matches/invite/public' })
  .input(matchTokenInputSchema)
  .output(publicMatchInvitePreviewSchema);

export const joinMatchContract = oc
  .route({ method: 'POST', path: '/matches/join' })
  .input(matchTokenInputSchema)
  .output(matchBoardSchema);

export const getMatchContract = oc
  .route({ method: 'GET', path: '/matches/detail' })
  .input(matchIdInputSchema)
  .output(matchBoardSchema);

export const submitMatchAttemptContract = oc
  .route({ method: 'POST', path: '/matches/attempts' })
  .input(submitMatchAttemptInputSchema)
  .output(matchBoardSchema);

export const cancelMatchContract = oc
  .route({ method: 'POST', path: '/matches/cancel' })
  .input(matchIdInputSchema)
  .output(matchBoardSchema);

export type MatchMetric = z.infer<typeof matchMetricSchema>;
export type MatchScoringMode = z.infer<typeof matchScoringModeSchema>;
export type MatchStatus = z.infer<typeof matchStatusSchema>;
export type MatchWindow = z.infer<typeof matchWindowSchema>;
export type MatchDurationDays = z.infer<typeof matchDurationDaysSchema>;
export type MatchStanding = z.infer<typeof matchStandingSchema>;
export type MatchBoard = z.infer<typeof matchBoardSchema>;
export type MatchInviteLink = z.infer<typeof matchInviteLinkSchema>;
export type CreateMatchInput = z.input<typeof createMatchInputSchema>;
/** Post-parse shape: `scoringMode` has its default applied, `crewId` may be absent. */
export type ResolvedCreateMatchInput = z.output<typeof createMatchInputSchema>;
export type CreateMatchOutput = z.infer<typeof createMatchOutputSchema>;
export type MatchPreview = z.infer<typeof matchPreviewSchema>;
export type PublicMatchInvitePreview = z.infer<
  typeof publicMatchInvitePreviewSchema
>;
export type MatchListItem = z.infer<typeof matchListItemSchema>;
export type ListMyMatchesOutput = z.infer<typeof listMyMatchesOutputSchema>;
export type SubmitMatchAttemptInput = z.infer<
  typeof submitMatchAttemptInputSchema
>;
