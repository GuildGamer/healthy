import { oc } from '@orpc/contract';
import { z } from 'zod';
import { challengeCaptureKindSchema } from './challenge-capture.js';
import {
  challengeFrequencySchema,
  healthCategorySchema,
  userChallengeStatusSchema,
} from './catalog-fields.js';

/** Lookback window for Phase A analytics rollups. */
export const adminAnalyticsRangeInputSchema = z.object({
  days: z.coerce.number().int().min(7).max(90).default(28),
});

export const adminAnalyticsDayCountSchema = z.object({
  day: z.string(),
  count: z.number().int().nonnegative(),
});

export const adminAnalyticsCountryCountSchema = z.object({
  /** ISO alpha-2 when known; null when unset. Not re-validated against the allowlist. */
  countryCode: z.string().length(2).nullable(),
  members: z.number().int().nonnegative(),
  share: z.number().min(0).max(1),
});

export const adminAnalyticsNamedCountSchema = z.object({
  key: z.string(),
  label: z.string(),
  count: z.number().int().nonnegative(),
});

export const adminOverviewAnalyticsSchema = z.object({
  generatedAt: z.string().datetime(),
  rangeDays: z.number().int(),
  membersActive: z.number().int().nonnegative(),
  membersTotal: z.number().int().nonnegative(),
  wauCompleters: z.number().int().nonnegative(),
  signups7d: z.number().int().nonnegative(),
  signupsInRange: z.number().int().nonnegative(),
  completionsInRange: z.number().int().nonnegative(),
  occurrencesInRange: z.number().int().nonnegative(),
  /** Completions ÷ occurrences created in range; 0 when none. */
  completionRateInRange: z.number().min(0).max(1),
  waitlistInRange: z.number().int().nonnegative(),
  countryCaptureRate: z.number().min(0).max(1),
  activationRate: z.number().min(0).max(1),
  topCountries: z.array(adminAnalyticsCountryCountSchema),
  sparklineSignups: z.array(adminAnalyticsDayCountSchema),
  sparklineCompletions: z.array(adminAnalyticsDayCountSchema),
});

export const adminMarketsAnalyticsSchema = z.object({
  generatedAt: z.string().datetime(),
  rangeDays: z.number().int(),
  membersActive: z.number().int().nonnegative(),
  unknownCountry: z.number().int().nonnegative(),
  countries: z.array(adminAnalyticsCountryCountSchema),
  signupsByCountryInRange: z.array(adminAnalyticsCountryCountSchema),
  categoryMix: z.array(
    z.object({
      category: healthCategorySchema,
      members: z.number().int().nonnegative(),
      share: z.number().min(0).max(1),
    }),
  ),
});

export const adminGrowthAnalyticsSchema = z.object({
  generatedAt: z.string().datetime(),
  rangeDays: z.number().int(),
  waitlistTotal: z.number().int().nonnegative(),
  waitlistInRange: z.number().int().nonnegative(),
  waitlistBySource: z.array(adminAnalyticsNamedCountSchema),
  signupsInRange: z.number().int().nonnegative(),
  signupsByDay: z.array(adminAnalyticsDayCountSchema),
  verifiedInRange: z.number().int().nonnegative(),
  activationRate: z.number().min(0).max(1),
  countryCaptureRate: z.number().min(0).max(1),
  activatedInRange: z.number().int().nonnegative(),
});

export const adminEngagementAnalyticsSchema = z.object({
  generatedAt: z.string().datetime(),
  rangeDays: z.number().int(),
  wauCompleters: z.number().int().nonnegative(),
  completersInRange: z.number().int().nonnegative(),
  completionsInRange: z.number().int().nonnegative(),
  occurrencesInRange: z.number().int().nonnegative(),
  completionRateInRange: z.number().min(0).max(1),
  statusBreakdown: z.array(
    z.object({
      status: userChallengeStatusSchema,
      count: z.number().int().nonnegative(),
    }),
  ),
  streakBuckets: z.array(adminAnalyticsNamedCountSchema),
  averageActiveEnrollments: z.number().nonnegative(),
  captureKindBreakdown: z.array(
    z.object({
      captureKind: challengeCaptureKindSchema,
      completions: z.number().int().nonnegative(),
    }),
  ),
  categoryCompletions: z.array(
    z.object({
      category: healthCategorySchema,
      completions: z.number().int().nonnegative(),
      occurrences: z.number().int().nonnegative(),
      completionRate: z.number().min(0).max(1),
    }),
  ),
  frequencyBreakdown: z.array(
    z.object({
      frequency: challengeFrequencySchema,
      completions: z.number().int().nonnegative(),
    }),
  ),
  leaderboardOptInRate: z.number().min(0).max(1),
});

export const adminCatalogAnalyticsRowSchema = z.object({
  challengeId: z.string(),
  slug: z.string(),
  title: z.string(),
  category: healthCategorySchema,
  isDefault: z.boolean(),
  isActive: z.boolean(),
  activeEnrollments: z.number().int().nonnegative(),
  completionsInRange: z.number().int().nonnegative(),
  occurrencesInRange: z.number().int().nonnegative(),
  completionRateInRange: z.number().min(0).max(1),
});

export const adminCatalogAnalyticsSchema = z.object({
  generatedAt: z.string().datetime(),
  rangeDays: z.number().int(),
  challenges: z.array(adminCatalogAnalyticsRowSchema),
});

export const adminRemindersAnalyticsSchema = z.object({
  generatedAt: z.string().datetime(),
  rangeDays: z.number().int(),
  activeEnrollments: z.number().int().nonnegative(),
  enrollmentsWithReminder: z.number().int().nonnegative(),
  reminderCoverage: z.number().min(0).max(1),
  deliveriesInRange: z.number().int().nonnegative(),
  pushDevicesActive: z.number().int().nonnegative(),
  pushByPlatform: z.array(adminAnalyticsNamedCountSchema),
  notificationsInRange: z.number().int().nonnegative(),
  notificationsReadInRange: z.number().int().nonnegative(),
  notificationReadRate: z.number().min(0).max(1),
  surpriseEvidenceInRange: z.array(adminAnalyticsNamedCountSchema),
});

export const getAdminOverviewAnalyticsContract = oc
  .route({ method: 'GET', path: '/admin/analytics/overview' })
  .input(adminAnalyticsRangeInputSchema)
  .output(adminOverviewAnalyticsSchema);

export const getAdminMarketsAnalyticsContract = oc
  .route({ method: 'GET', path: '/admin/analytics/markets' })
  .input(adminAnalyticsRangeInputSchema)
  .output(adminMarketsAnalyticsSchema);

export const getAdminGrowthAnalyticsContract = oc
  .route({ method: 'GET', path: '/admin/analytics/growth' })
  .input(adminAnalyticsRangeInputSchema)
  .output(adminGrowthAnalyticsSchema);

export const getAdminEngagementAnalyticsContract = oc
  .route({ method: 'GET', path: '/admin/analytics/engagement' })
  .input(adminAnalyticsRangeInputSchema)
  .output(adminEngagementAnalyticsSchema);

export const getAdminCatalogAnalyticsContract = oc
  .route({ method: 'GET', path: '/admin/analytics/catalog' })
  .input(adminAnalyticsRangeInputSchema)
  .output(adminCatalogAnalyticsSchema);

export const getAdminRemindersAnalyticsContract = oc
  .route({ method: 'GET', path: '/admin/analytics/reminders' })
  .input(adminAnalyticsRangeInputSchema)
  .output(adminRemindersAnalyticsSchema);

export type AdminAnalyticsRangeInput = z.input<
  typeof adminAnalyticsRangeInputSchema
>;
export type AdminOverviewAnalytics = z.infer<typeof adminOverviewAnalyticsSchema>;
export type AdminMarketsAnalytics = z.infer<typeof adminMarketsAnalyticsSchema>;
export type AdminGrowthAnalytics = z.infer<typeof adminGrowthAnalyticsSchema>;
export type AdminEngagementAnalytics = z.infer<
  typeof adminEngagementAnalyticsSchema
>;
export type AdminCatalogAnalytics = z.infer<typeof adminCatalogAnalyticsSchema>;
export type AdminRemindersAnalytics = z.infer<
  typeof adminRemindersAnalyticsSchema
>;
