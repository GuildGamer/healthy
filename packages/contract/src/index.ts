import { oc } from '@orpc/contract';
import { z } from 'zod';
import { listTipsContract } from './admin.js';
import {
  challengeCompletionKindSchema,
  challengeFrequencySchema,
  challengeIconSchema,
  healthCategorySchema,
  userChallengeStatusSchema,
} from './catalog-fields.js';
import {
  challengeCaptureSchema,
  deviceActivitySchema,
  deviceMetricSchema,
  healthLinkStatusSchema,
  updateHealthLinkInputSchema,
} from './challenge-capture.js';
import {
  challengeCarbsSchema,
  challengeDraftSchema,
  challengeGlucoseSchema,
  challengePeakFlowSchema,
  challengeProgressSchema,
  challengeWaterSchema,
  glucoseContextSchema,
  saveChallengeDraftInputSchema,
  waterUnitSchema,
} from './challenge-logging.js';
import { countryCodeSchema } from './country-code.js';
import { getMembershipOfferContract } from './membership.js';

export { challengeSpecIssue } from './challenge-spec.js';
export {
  ISO_COUNTRY_CODES,
  countryCodeSchema,
  isValidCountryCode,
  normalizeCountryCode,
  type CountryCode,
} from './country-code.js';
export {
  activityMeetsTarget,
  challengeCaptureKindSchema,
  challengeCaptureSchema,
  challengeTargetSchema,
  defaultCaptureKindFor,
  deviceActivitySchema,
  deviceActivitySourceSchema,
  deviceMetricSchema,
  emptyChallengeTarget,
  healthLinkStatusSchema,
  isDeviceCapture,
  resolveEnrollmentTargetCount,
  selfReportCapture,
  toChallengeCapture,
  updateHealthLinkInputSchema,
} from './challenge-capture.js';
export type {
  ChallengeCapture,
  ChallengeCaptureKind,
  ChallengeTarget,
  DeviceActivity,
  DeviceActivitySource,
  DeviceMetric,
  HealthLinkStatus,
  UpdateHealthLinkInput,
} from './challenge-capture.js';

export {
  DEFAULT_IN_PROGRESS_NUDGE_DELAY_MINUTES,
  IN_PROGRESS_NUDGE_DELAY_MAX,
  IN_PROGRESS_NUDGE_DELAY_MIN,
  assertDraftMatchesKind,
  challengeCarbsDraftSchema,
  challengeCarbsSchema,
  challengeDraftSchema,
  challengeGlucoseDraftSchema,
  challengeGlucoseSchema,
  challengePeakFlowDraftSchema,
  challengePeakFlowSchema,
  challengeProgressSchema,
  challengeVitalsDraftSchema,
  challengeWaterDraftSchema,
  challengeWaterSchema,
  fieldProgress,
  glucoseContextSchema,
  saveChallengeDraftInputSchema,
  waterUnitSchema,
} from './challenge-logging.js';
export type {
  ChallengeCarbs,
  ChallengeDraft,
  ChallengeFieldProgress,
  ChallengeGlucose,
  ChallengePeakFlow,
  ChallengeWater,
  GlucoseContext,
  WaterUnit,
} from './challenge-logging.js';

export {
  DEFAULT_CHALLENGE_ICON,
  challengeCompletionKindSchema,
  challengeFrequencySchema,
  challengeIconSchema,
  healthCategorySchema,
  toChallengeIcon,
  userChallengeStatusSchema,
} from './catalog-fields.js';
export type {
  ChallengeCompletionKind,
  ChallengeFrequency,
  HealthCategory,
  UserChallengeStatus,
} from './catalog-fields.js';

export {
  adminCanManageAdmins,
  adminHasPermission,
  adminRoleSchema,
} from './admin-roles.js';
export type { AdminRoleName } from './admin-roles.js';

export {
  adminContract,
  listTipsContract,
} from './admin.js';
export type {
  AdminChallenge,
  AdminContract,
  AdminMeOutput,
  AdminMemberListItem,
  AdminMemberOutput,
  AdminMemberSummary,
  AdminOperator,
  AdminTip,
  AdminWaitlistEntry,
  AdjustAdminMemberPointsInput,
  InviteAdminInput,
  ListPublicTipsOutput,
  MembershipPlan,
  PublicTip,
  SetAdminMemberActiveInput,
  UpdateAdminChallengeInput,
  UpdateAdminTipInput,
  UpdateMembershipPlanInput,
  UpsertAdminChallengeInput,
  UpsertAdminTipInput,
  UpsertMembershipPlanInput,
} from './admin.js';
export type {
  AdminAnalyticsRangeInput,
  AdminCatalogAnalytics,
  AdminEngagementAnalytics,
  AdminGrowthAnalytics,
  AdminMarketsAnalytics,
  AdminOverviewAnalytics,
  AdminRemindersAnalytics,
} from './admin-analytics.js';
export {
  MEMBERSHIP_DEFAULT_MARKET,
  membershipCurrencySchema,
  membershipIntervalSchema,
  membershipPaymentMethodIdSchema,
} from './membership.js';
export { formatMembershipAmount, resolveMembershipMarketKey } from './membership-format.js';
export type {
  MembershipCurrency,
  MembershipInterval,
  MembershipOffer,
  MembershipPaymentMethodId,
} from './membership.js';

export const challengeVitalsSchema = z.object({
  systolic: z.number().int().min(50).max(250),
  diastolic: z.number().int().min(30).max(180),
  pulse: z.number().int().min(30).max(220).optional(),
  notes: z.string().trim().max(500).optional(),
});

export const healthOutputSchema = z.object({
  status: z.literal('ok'),
  service: z.string(),
  timestamp: z.string().datetime(),
});

export const meOutputSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable(),
  categories: z.array(healthCategorySchema),
  pointsBalance: z.number().int().nonnegative(),
  currentStreakDays: z.number().int().nonnegative(),
  /** IANA zone deciding when this user's challenge day rolls over. */
  timeZone: z.string(),
  /** ISO 3166-1 alpha-2. Null until chosen at sign-up or in profile. */
  countryCode: countryCodeSchema.nullable(),
  /** Public name. Falls back to a generated pseudonym until one is chosen. */
  displayName: z.string(),
  reminderEnabled: z.boolean(),
  /** Local wall-clock minutes past midnight, 0 to 1439. */
  reminderMinute: z.number().int().min(0).max(1439),
  evidenceRemindersEnabled: z.boolean(),
  promotionalMessagesEnabled: z.boolean(),
  showOnLeaderboard: z.boolean(),
  inProgressNudgeEnabled: z.boolean(),
  inProgressNudgeDelayMinutes: z.number().int().min(5).max(1_440),
  /** Whether this installation may read Health / Health Connect samples. */
  healthLinkStatus: healthLinkStatusSchema,
  /** Paid membership entitlements (checkout later). */
  hasMembership: z.boolean(),
  /** Reminder slots allowed per challenge for this member. */
  maxRemindersPerChallenge: z.number().int().positive(),
});

export const updateCategoriesInputSchema = z.object({
  categories: z.array(healthCategorySchema).min(1).max(healthCategorySchema.options.length),
});

export const updateTimeZoneInputSchema = z.object({
  timeZone: z.string().min(1).max(64),
});

export const updateCountryInputSchema = z.object({
  countryCode: countryCodeSchema,
});

/**
 * Deliberately narrow: a leaderboard is the first place users see each other,
 * so it carries a name and a score and nothing that identifies a real person.
 */
export const leaderboardEntrySchema = z.object({
  rank: z.number().int().positive(),
  displayName: z.string(),
  points: z.number().int(),
  isCurrentUser: z.boolean(),
});

export const leaderboardPeriodSchema = z.enum(['week', 'month', 'all']);

export const listLeaderboardInputSchema = z.object({
  period: leaderboardPeriodSchema.default('week'),
  category: healthCategorySchema.optional(),
});

export const listLeaderboardOutputSchema = z.object({
  /** ISO date of the Monday the current ranking period opened, in UTC. */
  weekStart: z.string(),
  period: leaderboardPeriodSchema,
  /** First day of the selected window, or null for all-time. */
  periodStart: z.string().nullable(),
  entries: z.array(leaderboardEntrySchema),
  /** Null until the caller has earned a point in this window. */
  currentUserRank: z.number().int().positive().nullable(),
  currentUserPoints: z.number().int(),
  /**
   * False when the caller turned off “Show me on the leaderboard”.
   * Rank is then null and they never appear in `entries`.
   */
  currentUserVisible: z.boolean(),
});

export const updateDisplayNameInputSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2)
    .max(24)
    .regex(
      /^[\p{L}\p{N} ._-]+$/u,
      'Use letters, numbers, spaces, dots, hyphens or underscores',
    ),
});

export const updateReminderInputSchema = z.object({
  enabled: z.boolean(),
  reminderMinute: z.number().int().min(0).max(1439),
});

/** Full snapshot of the designed Profile notification and privacy toggles. */
export const updateNotificationSettingsInputSchema = z.object({
  reminderEnabled: z.boolean(),
  evidenceRemindersEnabled: z.boolean(),
  promotionalMessagesEnabled: z.boolean(),
  showOnLeaderboard: z.boolean(),
  inProgressNudgeEnabled: z.boolean(),
  inProgressNudgeDelayMinutes: z.number().int().min(5).max(1_440),
});

export const notificationKindSchema = z.enum([
  'reminder',
  'success',
  'evidence',
  'penalty',
]);

/** Open surprise-photo window after a check-in or vitals completion. */
export const surpriseEvidenceRequestSchema = z.object({
  expiresAt: z.string().datetime(),
  windowSeconds: z.number().int().positive(),
  penaltyPoints: z.number().int().nonnegative(),
});

export const inboxNotificationSchema = z.object({
  id: z.string(),
  kind: notificationKindSchema,
  title: z.string(),
  body: z.string(),
  isRead: z.boolean(),
  createdAt: z.string().datetime(),
});

export const listNotificationsOutputSchema = z.object({
  notifications: z.array(inboxNotificationSchema),
  unreadCount: z.number().int().nonnegative(),
});

export const markNotificationsReadOutputSchema = z.object({
  unreadCount: z.number().int().nonnegative(),
});

/** One nudge time on an enrolled challenge. */
export const challengeReminderSchema = z.object({
  id: z.string(),
  /** Local wall-clock minutes past midnight, 0 to 1439. */
  minuteOfDay: z.number().int().min(0).max(1439),
});

export const challengeRemindersOutputSchema = z.object({
  challengeId: z.string(),
  reminders: z.array(challengeReminderSchema),
});

export const addChallengeReminderInputSchema = z.object({
  challengeId: z.string().min(1),
  minuteOfDay: z.number().int().min(0).max(1439),
});

export const removeChallengeReminderInputSchema = z.object({
  reminderId: z.string().min(1),
});

export const devicePlatformSchema = z.enum(['ios', 'android']);

export const registerPushDeviceInputSchema = z.object({
  /** Expo push token for this installation, e.g. `ExponentPushToken[...]`. */
  expoPushToken: z.string().min(1).max(256),
  platform: devicePlatformSchema,
});

export const unregisterPushDeviceInputSchema = z.object({
  expoPushToken: z.string().min(1).max(256),
});

export const pushDeviceOutputSchema = z.object({
  expoPushToken: z.string(),
  platform: devicePlatformSchema,
  isActive: z.boolean(),
});

export const unregisterPushDeviceOutputSchema = z.object({
  success: z.literal(true),
});

export const todayChallengeSchema = z.object({
  id: z.string(),
  challengeId: z.string(),
  title: z.string(),
  description: z.string(),
  category: healthCategorySchema,
  rewardPoints: z.number().int().positive(),
  status: userChallengeStatusSchema,
  frequency: challengeFrequencySchema,
  completionKind: challengeCompletionKindSchema,
  instruction: z.string(),
  icon: challengeIconSchema,
  /**
   * First day of the period this occurrence belongs to: the day itself for
   * daily, the Monday for weekly, the 1st for monthly.
   */
  periodKey: z.string(),
  /** Present while a surprise photo window is still open. */
  evidenceRequest: surpriseEvidenceRequestSchema.nullable(),
  /** Partial log saved as the member types. Null until the first draft write. */
  draft: challengeDraftSchema.nullable(),
  /** Required fields filled / required fields. Check-in and gym photo are 0/1. */
  progress: challengeProgressSchema,
  /** How this challenge expects proof — independent of completionKind. */
  capture: challengeCaptureSchema,
});

export const listTodayChallengesOutputSchema = z.object({
  dayKey: z.string(),
  challenges: z.array(todayChallengeSchema),
  completedCount: z.number().int().nonnegative(),
  totalCount: z.number().int().nonnegative(),
});

/** A catalog challenge paired with the caller's opt-in state for it. */
export const catalogChallengeSchema = z.object({
  challengeId: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  category: healthCategorySchema,
  rewardPoints: z.number().int().positive(),
  frequency: challengeFrequencySchema,
  completionKind: challengeCompletionKindSchema,
  instruction: z.string(),
  icon: challengeIconSchema,
  isEnrolled: z.boolean(),
  /** True when this challenge needs membership to enroll. */
  requiresMembership: z.boolean(),
  /** True when the caller cannot enroll without upgrading. */
  isLocked: z.boolean(),
  /** Empty unless enrolled; the times this challenge nudges at. */
  reminders: z.array(challengeReminderSchema),
  capture: challengeCaptureSchema,
});

export const challengeCatalogOutputSchema = z.object({
  challenges: z.array(catalogChallengeSchema),
  enrolledCount: z.number().int().nonnegative(),
  hasMembership: z.boolean(),
  maxRemindersPerChallenge: z.number().int().positive(),
});

export const setChallengeEnrollmentInputSchema = z.object({
  challengeId: z.string().min(1),
  isEnrolled: z.boolean(),
  /** Omit to keep the catalog default, or the cadence already chosen. */
  frequency: challengeFrequencySchema.optional(),
  /** Omit to keep the catalog default, or the count already chosen. */
  targetCount: z.number().int().positive().max(200_000).optional(),
});

export const startChallengeInputSchema = z.object({
  userChallengeId: z.string().min(1),
});

/** Starting only moves the assignment along; points are awarded on completion. */
export const startChallengeOutputSchema = z.object({
  challenge: todayChallengeSchema,
});

/** JPEG or PNG, base64 only. The API validates and does not store the bytes. */
export const challengeEvidenceSchema = z.object({
  mimeType: z.enum(['image/jpeg', 'image/png']),
  imageBase64: z.string().min(32).max(2_000_000),
});

export const completeChallengeInputSchema = z.object({
  userChallengeId: z.string().min(1),
  vitals: challengeVitalsSchema.optional(),
  evidence: challengeEvidenceSchema.optional(),
  glucose: challengeGlucoseSchema.optional(),
  peakFlow: challengePeakFlowSchema.optional(),
  water: challengeWaterSchema.optional(),
  carbs: challengeCarbsSchema.optional(),
  deviceActivity: deviceActivitySchema.optional(),
});

export const completeChallengeOutputSchema = z.object({
  challenge: todayChallengeSchema,
  pointsBalance: z.number().int().nonnegative(),
  currentStreakDays: z.number().int().nonnegative(),
  pointsAwarded: z.number().int().nonnegative(),
  /** Null unless this completion opened or is still waiting on a surprise photo. */
  evidenceRequest: surpriseEvidenceRequestSchema.nullable(),
  penaltyApplied: z.number().int().nonnegative(),
});

export const skipChallengeEvidenceInputSchema = z.object({
  userChallengeId: z.string().min(1),
});

export const activityItemSchema = z.object({
  id: z.string(),
  delta: z.number().int(),
  reason: z.string(),
  createdAt: z.string().datetime(),
});

export const listActivityOutputSchema = z.object({
  items: z.array(activityItemSchema),
});

export const challengeHistoryOutcomeSchema = z.enum(['rewarded', 'penalized']);

export const challengeHistoryEvidenceSchema = z.enum([
  'submitted',
  'skipped',
  'expired',
]);

export const challengeHistoryLogSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('check_in') }),
  z.object({
    kind: z.literal('vitals_bp'),
    systolic: z.number().int(),
    diastolic: z.number().int(),
    pulse: z.number().int().nullable(),
    notes: z.string().nullable(),
  }),
  z.object({
    kind: z.literal('glucose'),
    mmolL: z.number(),
    context: glucoseContextSchema,
  }),
  z.object({
    kind: z.literal('peak_flow'),
    bestLitresPerMinute: z.number().int(),
  }),
  z.object({
    kind: z.literal('water'),
    amount: z.number().int(),
    unit: waterUnitSchema,
  }),
  z.object({
    kind: z.literal('carbs'),
    grams: z.number().int().nullable(),
    note: z.string().nullable(),
  }),
  z.object({ kind: z.literal('evidence_photo') }),
  z.object({
    kind: z.literal('device'),
    metric: deviceMetricSchema,
    durationSeconds: z.number().int().nullable(),
    distanceMeters: z.number().int().nullable(),
    count: z.number().int().nullable(),
  }),
]);

export const challengeHistoryEntrySchema = z.object({
  id: z.string(),
  periodKey: z.string(),
  completedAt: z.string().datetime(),
  outcome: challengeHistoryOutcomeSchema,
  pointsDelta: z.number().int(),
  log: challengeHistoryLogSchema.nullable(),
  evidence: challengeHistoryEvidenceSchema.nullable(),
});

export const listChallengeHistoryInputSchema = z.object({
  challengeId: z.string().min(1),
});

export const listChallengeHistoryOutputSchema = z.object({
  challengeId: z.string(),
  entries: z.array(challengeHistoryEntrySchema),
});

export const healthContract = oc
  .route({ method: 'GET', path: '/health' })
  .output(healthOutputSchema);

export const meContract = oc.route({ method: 'GET', path: '/me' }).output(meOutputSchema);

export const updateCategoriesContract = oc
  .route({ method: 'PUT', path: '/me/categories' })
  .input(updateCategoriesInputSchema)
  .output(meOutputSchema);

export const updateTimeZoneContract = oc
  .route({ method: 'PUT', path: '/me/timezone' })
  .input(updateTimeZoneInputSchema)
  .output(meOutputSchema);

export const updateCountryContract = oc
  .route({ method: 'PUT', path: '/me/country' })
  .input(updateCountryInputSchema)
  .output(meOutputSchema);

export const listLeaderboardContract = oc
  .route({ method: 'GET', path: '/leaderboard' })
  .input(listLeaderboardInputSchema)
  .output(listLeaderboardOutputSchema);

export const updateDisplayNameContract = oc
  .route({ method: 'PUT', path: '/me/display-name' })
  .input(updateDisplayNameInputSchema)
  .output(meOutputSchema);

export const updateReminderContract = oc
  .route({ method: 'PUT', path: '/me/reminder' })
  .input(updateReminderInputSchema)
  .output(meOutputSchema);

export const updateNotificationSettingsContract = oc
  .route({ method: 'PUT', path: '/me/notification-settings' })
  .input(updateNotificationSettingsInputSchema)
  .output(meOutputSchema);

export const updateHealthLinkContract = oc
  .route({ method: 'PUT', path: '/me/health-link' })
  .input(updateHealthLinkInputSchema)
  .output(meOutputSchema);

export const listNotificationsContract = oc
  .route({ method: 'GET', path: '/notifications' })
  .output(listNotificationsOutputSchema);

export const markNotificationsReadContract = oc
  .route({ method: 'POST', path: '/notifications/read' })
  .output(markNotificationsReadOutputSchema);

export const listTodayChallengesContract = oc
  .route({ method: 'GET', path: '/challenges/today' })
  .output(listTodayChallengesOutputSchema);

export const startChallengeContract = oc
  .route({ method: 'POST', path: '/challenges/start' })
  .input(startChallengeInputSchema)
  .output(startChallengeOutputSchema);

export const completeChallengeContract = oc
  .route({ method: 'POST', path: '/challenges/complete' })
  .input(completeChallengeInputSchema)
  .output(completeChallengeOutputSchema);

export const skipChallengeEvidenceContract = oc
  .route({ method: 'POST', path: '/challenges/evidence/skip' })
  .input(skipChallengeEvidenceInputSchema)
  .output(completeChallengeOutputSchema);

export const saveChallengeDraftContract = oc
  .route({ method: 'PUT', path: '/challenges/draft' })
  .input(saveChallengeDraftInputSchema)
  .output(startChallengeOutputSchema);

export const listChallengeCatalogContract = oc
  .route({ method: 'GET', path: '/challenges/catalog' })
  .output(challengeCatalogOutputSchema);

export const setChallengeEnrollmentContract = oc
  .route({ method: 'PUT', path: '/challenges/enrollment' })
  .input(setChallengeEnrollmentInputSchema)
  .output(challengeCatalogOutputSchema);

export const addChallengeReminderContract = oc
  .route({ method: 'POST', path: '/challenges/reminders' })
  .input(addChallengeReminderInputSchema)
  .output(challengeRemindersOutputSchema);

export const removeChallengeReminderContract = oc
  .route({ method: 'DELETE', path: '/challenges/reminders' })
  .input(removeChallengeReminderInputSchema)
  .output(challengeRemindersOutputSchema);

export const registerPushDeviceContract = oc
  .route({ method: 'POST', path: '/me/push-devices' })
  .input(registerPushDeviceInputSchema)
  .output(pushDeviceOutputSchema);

export const unregisterPushDeviceContract = oc
  .route({ method: 'DELETE', path: '/me/push-devices' })
  .input(unregisterPushDeviceInputSchema)
  .output(unregisterPushDeviceOutputSchema);

export const listActivityContract = oc
  .route({ method: 'GET', path: '/activity' })
  .output(listActivityOutputSchema);

export const listChallengeHistoryContract = oc
  .route({ method: 'GET', path: '/challenges/history' })
  .input(listChallengeHistoryInputSchema)
  .output(listChallengeHistoryOutputSchema);

export const waitlistInputSchema = z.object({
  email: z.string().email(),
  source: z.string().max(100).optional(),
});

export const waitlistOutputSchema = z.object({
  id: z.string(),
  email: z.string().email(),
});

export const waitlistContract = oc
  .route({ method: 'POST', path: '/waitlist' })
  .input(waitlistInputSchema)
  .output(waitlistOutputSchema);

export const appContract = {
  health: healthContract,
  me: meContract,
  updateCategories: updateCategoriesContract,
  updateTimeZone: updateTimeZoneContract,
  updateCountry: updateCountryContract,
  updateReminder: updateReminderContract,
  updateNotificationSettings: updateNotificationSettingsContract,
  updateHealthLink: updateHealthLinkContract,
  updateDisplayName: updateDisplayNameContract,
  listNotifications: listNotificationsContract,
  markNotificationsRead: markNotificationsReadContract,
  listLeaderboard: listLeaderboardContract,
  listTodayChallenges: listTodayChallengesContract,
  listChallengeCatalog: listChallengeCatalogContract,
  setChallengeEnrollment: setChallengeEnrollmentContract,
  addChallengeReminder: addChallengeReminderContract,
  removeChallengeReminder: removeChallengeReminderContract,
  registerPushDevice: registerPushDeviceContract,
  unregisterPushDevice: unregisterPushDeviceContract,
  startChallenge: startChallengeContract,
  completeChallenge: completeChallengeContract,
  skipChallengeEvidence: skipChallengeEvidenceContract,
  saveChallengeDraft: saveChallengeDraftContract,
  listActivity: listActivityContract,
  listChallengeHistory: listChallengeHistoryContract,
  waitlist: waitlistContract,
  listTips: listTipsContract,
  getMembershipOffer: getMembershipOfferContract,
};

export type AppContract = typeof appContract;
export type HealthOutput = z.infer<typeof healthOutputSchema>;
export type MeOutput = z.infer<typeof meOutputSchema>;
export type UpdateCategoriesInput = z.infer<typeof updateCategoriesInputSchema>;
export type UpdateTimeZoneInput = z.infer<typeof updateTimeZoneInputSchema>;
export type UpdateCountryInput = z.infer<typeof updateCountryInputSchema>;
export type UpdateReminderInput = z.infer<typeof updateReminderInputSchema>;
export type UpdateNotificationSettingsInput = z.infer<
  typeof updateNotificationSettingsInputSchema
>;
export type NotificationKind = z.infer<typeof notificationKindSchema>;
export type InboxNotification = z.infer<typeof inboxNotificationSchema>;
export type ListNotificationsOutput = z.infer<
  typeof listNotificationsOutputSchema
>;
export type MarkNotificationsReadOutput = z.infer<
  typeof markNotificationsReadOutputSchema
>;
export type UpdateDisplayNameInput = z.infer<
  typeof updateDisplayNameInputSchema
>;
export type LeaderboardEntry = z.infer<typeof leaderboardEntrySchema>;
export type LeaderboardPeriod = z.infer<typeof leaderboardPeriodSchema>;
export type ListLeaderboardInput = z.input<typeof listLeaderboardInputSchema>;
export type ListLeaderboardOutput = z.infer<typeof listLeaderboardOutputSchema>;
export type ChallengeVitals = z.infer<typeof challengeVitalsSchema>;
export type ChallengeEvidence = z.infer<typeof challengeEvidenceSchema>;
export type SaveChallengeDraftInput = z.infer<
  typeof saveChallengeDraftInputSchema
>;
export type TodayChallenge = z.infer<typeof todayChallengeSchema>;
export type CatalogChallenge = z.infer<typeof catalogChallengeSchema>;
export type ChallengeCatalogOutput = z.infer<
  typeof challengeCatalogOutputSchema
>;
export type SetChallengeEnrollmentInput = z.infer<
  typeof setChallengeEnrollmentInputSchema
>;
export type ListTodayChallengesOutput = z.infer<typeof listTodayChallengesOutputSchema>;
export type StartChallengeInput = z.infer<typeof startChallengeInputSchema>;
export type StartChallengeOutput = z.infer<typeof startChallengeOutputSchema>;
export type CompleteChallengeInput = z.infer<typeof completeChallengeInputSchema>;
export type CompleteChallengeOutput = z.infer<typeof completeChallengeOutputSchema>;
export type SurpriseEvidenceRequest = z.infer<
  typeof surpriseEvidenceRequestSchema
>;
export type SkipChallengeEvidenceInput = z.infer<
  typeof skipChallengeEvidenceInputSchema
>;
export type ActivityItem = z.infer<typeof activityItemSchema>;
export type ListActivityOutput = z.infer<typeof listActivityOutputSchema>;
export type ChallengeHistoryOutcome = z.infer<
  typeof challengeHistoryOutcomeSchema
>;
export type ChallengeHistoryEvidence = z.infer<
  typeof challengeHistoryEvidenceSchema
>;
export type ChallengeHistoryLog = z.infer<typeof challengeHistoryLogSchema>;
export type ChallengeHistoryEntry = z.infer<typeof challengeHistoryEntrySchema>;
export type ListChallengeHistoryInput = z.input<
  typeof listChallengeHistoryInputSchema
>;
export type ListChallengeHistoryOutput = z.infer<
  typeof listChallengeHistoryOutputSchema
>;
export type WaitlistInput = z.infer<typeof waitlistInputSchema>;
export type WaitlistOutput = z.infer<typeof waitlistOutputSchema>;
export type ChallengeReminder = z.infer<typeof challengeReminderSchema>;
export type ChallengeRemindersOutput = z.infer<
  typeof challengeRemindersOutputSchema
>;
export type AddChallengeReminderInput = z.infer<
  typeof addChallengeReminderInputSchema
>;
export type RemoveChallengeReminderInput = z.infer<
  typeof removeChallengeReminderInputSchema
>;
export type RegisterPushDeviceInput = z.infer<
  typeof registerPushDeviceInputSchema
>;
