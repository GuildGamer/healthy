import { oc } from '@orpc/contract';
import { z } from 'zod';
import { matchMetricSchema } from './match-board.js';

/**
 * Typed property catalog for first-party analytics.
 * Strict at compile time for clients; the request schema stays a loose record
 * so store clients that lag behind still get their events stored.
 */
export const ANALYTICS_EVENT_PROPERTIES = {
  challenge_completed: z.record(z.string(), z.unknown()),
  challenge_cta_viewed: z.record(z.string(), z.unknown()),
  challenge_friend_clicked: z.record(z.string(), z.unknown()),
  challenge_created: z.record(z.string(), z.unknown()),
  challenge_share_sheet_opened: z.record(z.string(), z.unknown()),
  challenge_link_copied: z.record(z.string(), z.unknown()),
  challenge_shared: z.record(z.string(), z.unknown()),
  challenge_link_opened: z.record(z.string(), z.unknown()),
  challenge_recipient_signed_up: z.record(z.string(), z.unknown()),
  challenge_accepted: z.record(z.string(), z.unknown()),
  challenge_started_by_recipient: z.record(z.string(), z.unknown()),
  challenge_completed_by_recipient: z.record(z.string(), z.unknown()),
  challenge_again_clicked: z.record(z.string(), z.unknown()),
  challenge_new_friend_clicked: z.record(z.string(), z.unknown()),
  challenge_new_challenge_created: z.record(z.string(), z.unknown()),
  deferred_invite_stashed: z.record(z.string(), z.unknown()),
  deferred_invite_claimed: z.record(z.string(), z.unknown()),
  invite_restored_on_launch: z.record(z.string(), z.unknown()),
  invite_testflight_clicked: z.record(z.string(), z.unknown()),
  invite_app_opened: z.record(z.string(), z.unknown()),
  invite_auto_joined: z.record(z.string(), z.unknown()),
  invite_first_attempt: z.record(z.string(), z.unknown()),
  user_active: z.object({
    appVersion: z.string().max(64).optional(),
  }),
  push_opened: z.object({
    engagementDeliveryId: z.string().min(1).max(128).optional(),
  }).passthrough(),
  goal_ladder_offered: z.record(z.string(), z.unknown()),
  goal_ladder_accepted: z.record(z.string(), z.unknown()),
  goal_ladder_declined: z.record(z.string(), z.unknown()),

  app_opened: z.object({
    coldStart: z.boolean(),
  }),
  screen_viewed: z.object({
    screen: z.string().min(1).max(64),
  }),
  onboarding_step_viewed: z.object({
    step: z.string().min(1).max(64),
  }),
  sign_up_completed: z.object({
    method: z.string().min(1).max(32).optional(),
    viaInvite: z.boolean().optional(),
  }),
  permission_result: z.object({
    permission: z.enum([
      'notifications',
      'camera',
      'location',
      'motion',
      'health',
      'photos',
    ]),
    granted: z.boolean(),
    canAskAgain: z.boolean().optional(),
  }),
  activity_session_started: z.object({
    metric: matchMetricSchema,
    context: z.enum(['challenge', 'contest', 'practice']),
    matchId: z.string().max(64).optional(),
  }),
  activity_session_ended: z.object({
    metric: matchMetricSchema,
    context: z.enum(['challenge', 'contest', 'practice']),
    outcome: z.enum(['saved', 'abandoned', 'failed']),
    count: z.number().int().nonnegative(),
    durationSeconds: z.number().int().nonnegative(),
    matchId: z.string().max(64).optional(),
  }),
  share_completed: z.object({
    surface: z.string().min(1).max(64),
    completed: z.boolean(),
    activityType: z.string().max(128).optional(),
  }),
  setting_changed: z.object({
    setting: z.string().min(1).max(64),
    value: z.union([z.string().max(64), z.boolean(), z.number()]),
  }),
  paywall_viewed: z.object({
    source: z.string().max(64).optional(),
  }),
  plan_selected: z.object({
    planSlug: z.string().min(1).max(64),
  }),
  client_error: z.object({
    surface: z.string().min(1).max(64),
    code: z.string().min(1).max(64),
  }),
} as const;

export const ANALYTICS_EVENT_NAMES = Object.keys(
  ANALYTICS_EVENT_PROPERTIES,
) as [
  keyof typeof ANALYTICS_EVENT_PROPERTIES,
  ...(keyof typeof ANALYTICS_EVENT_PROPERTIES)[],
];

export const analyticsEventNameSchema = z.enum(ANALYTICS_EVENT_NAMES);

const PROPERTIES_MAX_BYTES = 4_096;

export const analyticsEventContextSchema = z
  .object({
    platform: z.enum(['ios', 'android', 'web']).optional(),
    appVersion: z.string().max(64).optional(),
    sessionId: z.string().min(1).max(128).optional(),
    emitter: z.enum(['mobile', 'web', 'server']).optional(),
  })
  .optional();

export const trackAnalyticsEventInputSchema = z.object({
  name: analyticsEventNameSchema,
  /** Client-generated id for pre-auth / web visitors. */
  anonymousId: z.string().min(1).max(128).optional(),
  properties: z
    .record(z.string(), z.unknown())
    .default({})
    .refine(
      (value) => JSON.stringify(value).length <= PROPERTIES_MAX_BYTES,
      { message: 'properties exceed size cap' },
    ),
  occurredAt: z.string().datetime().optional(),
  context: analyticsEventContextSchema,
});

export const trackAnalyticsEventOutputSchema = z.object({
  ok: z.literal(true),
});

export const trackAnalyticsEventContract = oc
  .route({ method: 'POST', path: '/analytics/events' })
  .input(trackAnalyticsEventInputSchema)
  .output(trackAnalyticsEventOutputSchema);

export const trackAnalyticsEventsBatchContract = oc
  .route({ method: 'POST', path: '/analytics/events/batch' })
  .input(
    z.object({
      events: z.array(trackAnalyticsEventInputSchema).min(1).max(50),
    }),
  )
  .output(trackAnalyticsEventOutputSchema);

export type AnalyticsEventName = z.infer<typeof analyticsEventNameSchema>;
export type AnalyticsEventProperties<Name extends AnalyticsEventName> = z.infer<
  (typeof ANALYTICS_EVENT_PROPERTIES)[Name]
>;
export type TrackAnalyticsEventInput = z.infer<
  typeof trackAnalyticsEventInputSchema
>;
export type AnalyticsEventContext = NonNullable<
  z.infer<typeof analyticsEventContextSchema>
>;
