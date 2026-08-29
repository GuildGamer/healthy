import { oc } from '@orpc/contract';
import { z } from 'zod';

export const healthCategorySchema = z.enum([
  'hypertension',
  'diabetes',
  'asthma',
  'general',
]);

export const userChallengeStatusSchema = z.enum([
  'pending',
  'in_progress',
  'completed',
]);

export const challengeFrequencySchema = z.enum(['daily', 'weekly', 'monthly']);

export const challengeCompletionKindSchema = z.enum(['check_in', 'vitals_bp']);

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
  /** Public name. Falls back to a generated pseudonym until one is chosen. */
  displayName: z.string(),
  reminderEnabled: z.boolean(),
  /** Local wall-clock minutes past midnight, 0 to 1439. */
  reminderMinute: z.number().int().min(0).max(1439),
  evidenceRemindersEnabled: z.boolean(),
  promotionalMessagesEnabled: z.boolean(),
  showOnLeaderboard: z.boolean(),
});

export const updateCategoriesInputSchema = z.object({
  categories: z.array(healthCategorySchema).min(1).max(healthCategorySchema.options.length),
});

export const updateTimeZoneInputSchema = z.object({
  timeZone: z.string().min(1).max(64),
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

export const listLeaderboardOutputSchema = z.object({
  /** ISO date of the Monday the current ranking period opened, in UTC. */
  weekStart: z.string(),
  entries: z.array(leaderboardEntrySchema),
  /** Null until the caller has earned a point this week. */
  currentUserRank: z.number().int().positive().nullable(),
  currentUserPoints: z.number().int(),
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
});

export const notificationKindSchema = z.enum(['reminder', 'success']);

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
  /**
   * First day of the period this occurrence belongs to: the day itself for
   * daily, the Monday for weekly, the 1st for monthly.
   */
  periodKey: z.string(),
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
  isEnrolled: z.boolean(),
  /** Empty unless enrolled; the times this challenge nudges at. */
  reminders: z.array(challengeReminderSchema),
});

export const challengeCatalogOutputSchema = z.object({
  challenges: z.array(catalogChallengeSchema),
  enrolledCount: z.number().int().nonnegative(),
});

export const setChallengeEnrollmentInputSchema = z.object({
  challengeId: z.string().min(1),
  isEnrolled: z.boolean(),
  /** Omit to keep the catalog default, or the cadence already chosen. */
  frequency: challengeFrequencySchema.optional(),
});

export const startChallengeInputSchema = z.object({
  userChallengeId: z.string().min(1),
});

/** Starting only moves the assignment along; points are awarded on completion. */
export const startChallengeOutputSchema = z.object({
  challenge: todayChallengeSchema,
});

export const completeChallengeInputSchema = z.object({
  userChallengeId: z.string().min(1),
  vitals: challengeVitalsSchema.optional(),
});

export const completeChallengeOutputSchema = z.object({
  challenge: todayChallengeSchema,
  pointsBalance: z.number().int().nonnegative(),
  currentStreakDays: z.number().int().nonnegative(),
  pointsAwarded: z.number().int().nonnegative(),
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

export const listLeaderboardContract = oc
  .route({ method: 'GET', path: '/leaderboard' })
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
  updateReminder: updateReminderContract,
  updateNotificationSettings: updateNotificationSettingsContract,
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
  listActivity: listActivityContract,
  waitlist: waitlistContract,
};

export type AppContract = typeof appContract;
export type HealthCategory = z.infer<typeof healthCategorySchema>;
export type HealthOutput = z.infer<typeof healthOutputSchema>;
export type MeOutput = z.infer<typeof meOutputSchema>;
export type UpdateCategoriesInput = z.infer<typeof updateCategoriesInputSchema>;
export type UpdateTimeZoneInput = z.infer<typeof updateTimeZoneInputSchema>;
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
export type ListLeaderboardOutput = z.infer<typeof listLeaderboardOutputSchema>;
export type ChallengeFrequency = z.infer<typeof challengeFrequencySchema>;
export type ChallengeCompletionKind = z.infer<
  typeof challengeCompletionKindSchema
>;
export type ChallengeVitals = z.infer<typeof challengeVitalsSchema>;
export type TodayChallenge = z.infer<typeof todayChallengeSchema>;
export type CatalogChallenge = z.infer<typeof catalogChallengeSchema>;
export type ChallengeCatalogOutput = z.infer<
  typeof challengeCatalogOutputSchema
>;
export type SetChallengeEnrollmentInput = z.infer<
  typeof setChallengeEnrollmentInputSchema
>;
export type ListTodayChallengesOutput = z.infer<typeof listTodayChallengesOutputSchema>;
export type UserChallengeStatus = z.infer<typeof userChallengeStatusSchema>;
export type StartChallengeInput = z.infer<typeof startChallengeInputSchema>;
export type StartChallengeOutput = z.infer<typeof startChallengeOutputSchema>;
export type CompleteChallengeInput = z.infer<typeof completeChallengeInputSchema>;
export type CompleteChallengeOutput = z.infer<typeof completeChallengeOutputSchema>;
export type ActivityItem = z.infer<typeof activityItemSchema>;
export type ListActivityOutput = z.infer<typeof listActivityOutputSchema>;
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
