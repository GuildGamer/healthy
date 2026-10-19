import { oc } from '@orpc/contract';
import { z } from 'zod';

/**
 * First-party funnel event names for the distribution experiment.
 * Keep snake_case; do not invent a second convention when PostHog lands later.
 */
export const ANALYTICS_EVENT_NAMES = [
  'challenge_completed',
  'challenge_cta_viewed',
  'challenge_friend_clicked',
  'challenge_created',
  'challenge_share_sheet_opened',
  'challenge_link_copied',
  'challenge_shared',
  'challenge_link_opened',
  'challenge_recipient_signed_up',
  'challenge_accepted',
  'challenge_started_by_recipient',
  'challenge_completed_by_recipient',
  'challenge_again_clicked',
  'challenge_new_friend_clicked',
  'challenge_new_challenge_created',
  /** Web / deep-link stash before Store install. */
  'deferred_invite_stashed',
  /** App claimed clipboard / SecureStore invite after install. */
  'deferred_invite_claimed',
  /** Cold launch found a pending match token and will route challenge-first. */
  'invite_restored_on_launch',
  'user_active',
] as const;

export const analyticsEventNameSchema = z.enum(ANALYTICS_EVENT_NAMES);

export const trackAnalyticsEventInputSchema = z.object({
  name: analyticsEventNameSchema,
  /** Client-generated id for pre-auth / web visitors. */
  anonymousId: z.string().min(1).max(128).optional(),
  properties: z.record(z.string(), z.unknown()).default({}),
  occurredAt: z.string().datetime().optional(),
});

export const trackAnalyticsEventOutputSchema = z.object({
  ok: z.literal(true),
});

export const trackAnalyticsEventContract = oc
  .route({ method: 'POST', path: '/analytics/events' })
  .input(trackAnalyticsEventInputSchema)
  .output(trackAnalyticsEventOutputSchema);

export type AnalyticsEventName = z.infer<typeof analyticsEventNameSchema>;
export type TrackAnalyticsEventInput = z.infer<
  typeof trackAnalyticsEventInputSchema
>;
