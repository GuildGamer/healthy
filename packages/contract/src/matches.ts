import { oc } from '@orpc/contract';
import { z } from 'zod';

export const MATCH_PARTICIPANT_CAP = 8;
export const MATCH_INVITE_SCHEME = 'healthy';

export const matchMetricSchema = z.enum(['pushups']);
export const matchScoringModeSchema = z.enum(['best_single']);
export const matchStatusSchema = z.enum(['open', 'completed', 'cancelled']);
export const matchWindowSchema = z.enum(['today', 'week']);
export const matchInviteTokenSchema = z
  .string()
  .min(8)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/);

export function matchInviteUrl(token: string): string {
  return `${MATCH_INVITE_SCHEME}://match/${token}`;
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

export const createMatchInputSchema = z.object({
  window: matchWindowSchema,
});

export const matchStandingSchema = z.object({
  userId: z.string().min(1),
  displayName: z.string().min(1),
  rank: z.number().int().positive(),
  bestCount: z.number().int().nonnegative(),
  isYou: z.boolean(),
  isHost: z.boolean(),
});

export const matchBoardSchema = z.object({
  id: z.string().min(1),
  token: z.string().min(1),
  metric: matchMetricSchema,
  scoringMode: matchScoringModeSchema,
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  status: matchStatusSchema,
  participantCount: z.number().int().nonnegative(),
  participantCap: z.number().int().positive(),
  yourBestCount: z.number().int().nonnegative(),
  winnerUserId: z.string().min(1).nullable(),
  standings: z.array(matchStandingSchema),
});

export const matchInviteLinkSchema = z.object({
  token: z.string().min(1),
  url: z.string().min(1),
});

export const createMatchOutputSchema = z.object({
  match: matchBoardSchema,
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
  endsAt: z.string().datetime(),
  participantCount: z.number().int().nonnegative(),
  participantCap: z.number().int().positive(),
  status: matchStatusSchema,
  alreadyJoined: z.boolean(),
  viewerIsHost: z.boolean(),
});

export const matchIdInputSchema = z.object({
  matchId: z.string().min(1),
});

export const matchListItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  metric: matchMetricSchema,
  scoringMode: matchScoringModeSchema,
  endsAt: z.string().datetime(),
  status: matchStatusSchema,
  participantCount: z.number().int().nonnegative(),
  yourBestCount: z.number().int().nonnegative(),
  yourRank: z.number().int().positive().nullable(),
});

export const listMyMatchesOutputSchema = z.object({
  live: z.array(matchListItemSchema),
  ended: z.array(matchListItemSchema),
});

export const submitMatchAttemptInputSchema = z.object({
  matchId: z.string().min(1),
  count: z.number().int().positive().max(200_000),
  durationSeconds: z.number().int().nonnegative().max(86_400),
  source: z.literal('in_app_pose'),
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
export type MatchStanding = z.infer<typeof matchStandingSchema>;
export type MatchBoard = z.infer<typeof matchBoardSchema>;
export type MatchInviteLink = z.infer<typeof matchInviteLinkSchema>;
export type CreateMatchInput = z.infer<typeof createMatchInputSchema>;
export type CreateMatchOutput = z.infer<typeof createMatchOutputSchema>;
export type MatchPreview = z.infer<typeof matchPreviewSchema>;
export type MatchListItem = z.infer<typeof matchListItemSchema>;
export type ListMyMatchesOutput = z.infer<typeof listMyMatchesOutputSchema>;
export type SubmitMatchAttemptInput = z.infer<
  typeof submitMatchAttemptInputSchema
>;
