import { oc } from '@orpc/contract';
import { z } from 'zod';
import { challengeCompletionKindSchema, healthCategorySchema } from './catalog-fields.js';
import { challengeCaptureSchema, deviceMetricSchema } from './challenge-capture.js';
import { activityProofClipSchema } from './proof-clips.js';

const dayKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Enough of a challenge to draw its mark in its own colour. Never a reading. */
const progressChallengeMarkSchema = z.object({
  challengeId: z.string(),
  category: healthCategorySchema,
  completionKind: challengeCompletionKindSchema,
  capture: challengeCaptureSchema,
});

/** A daily challenge that was due on a day, and whether it was finished. */
export const progressDayChallengeSchema = progressChallengeMarkSchema.extend({
  isDone: z.boolean(),
});

/** One row of History. Every value is the member's own. */
export const progressDaySchema = z.object({
  dayKey: dayKeySchema,
  /** Daily challenges due that day, in catalog order. Empty when the day was never opened. */
  dailyChallenges: z.array(progressDayChallengeSchema),
  /** What the day moved the balance by: everything earned, less anything lost. */
  pointsTotal: z.number().int(),
  /** Taken off that day for missed or skipped photo checks. */
  pointsLost: z.number().int().nonnegative(),
  /**
   * The member showed up that day: a rewarded daily challenge, or a measured
   * set logged for a contest or practice. Matches the streak's "did something".
   */
  isShownUp: z.boolean(),
});

export const progressDaysSchema = z.object({
  dayKey: dayKeySchema,
  /** The Monday of the member's current week, in their zone. */
  weekStartKey: dayKeySchema,
  /** The member's first day, in their zone. Days before it are not misses. */
  joinedDayKey: dayKeySchema,
  /** Newest first: today, back to the joined day or the window's first day. */
  days: z.array(progressDaySchema),
});

export const getProgressDayInputSchema = z.object({
  dayKey: dayKeySchema,
});

/**
 * A measured result that may leave the phone. Blood pressure, glucose, peak
 * flow, and every other reading are absent from this union on purpose.
 */
export const progressShareResultSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('reps'), count: z.number().int().nonnegative() }),
  z.object({ kind: z.literal('minutes'), minutes: z.number().int().positive() }),
  z.object({ kind: z.literal('glasses'), count: z.number().int().nonnegative() }),
  z.object({ kind: z.literal('gym') }),
]);

export const progressDoneItemSchema = progressChallengeMarkSchema.extend({
  userChallengeId: z.string(),
  title: z.string(),
  completedAt: z.string().datetime(),
  points: z.number().int().nonnegative(),
  /**
   * What a share image may show for this finish. Null for a reading, a plain
   * check-in, or any result whose numbers stay on the phone.
   */
  share: progressShareResultSchema.nullable(),
  /** The clip that filmed this finish, when one was recorded. */
  proofClip: activityProofClipSchema.nullable(),
});

export const photoCheckResolutionSchema = z.enum(['expired', 'skipped']);

export const progressMissedPhotoCheckSchema = progressChallengeMarkSchema.extend({
  userChallengeId: z.string(),
  title: z.string(),
  resolution: photoCheckResolutionSchema,
  /** How long the photo window was open. */
  windowSeconds: z.number().int().positive(),
  pointsLost: z.number().int().nonnegative(),
  at: z.string().datetime(),
});

/** A measured session that finished no challenge, so it earned nothing. */
export const progressPracticeItemSchema = z.object({
  id: z.string(),
  /** "Push-up practice", "Walk": the same name the activity feed used. */
  title: z.string(),
  metric: deviceMetricSchema,
  count: z.number().int().nonnegative().nullable(),
  durationSeconds: z.number().int().nonnegative().nullable(),
  recordedAt: z.string().datetime(),
  proofClip: activityProofClipSchema.nullable(),
});

/** Points moved by the team rather than a challenge, such as a bonus. */
export const progressAdjustmentSchema = z.object({
  id: z.string(),
  reason: z.string(),
  points: z.number().int(),
  at: z.string().datetime(),
});

export const progressDayDetailSchema = z.object({
  dayKey: dayKeySchema,
  pointsEarned: z.number().int().nonnegative(),
  pointsLost: z.number().int().nonnegative(),
  dailyDoneCount: z.number().int().nonnegative(),
  dailyDueCount: z.number().int().nonnegative(),
  /** Oldest first, as the day went. */
  done: z.array(progressDoneItemSchema),
  missedPhotoChecks: z.array(progressMissedPhotoCheckSchema),
  practice: z.array(progressPracticeItemSchema),
  adjustments: z.array(progressAdjustmentSchema),
});

export const listProgressDaysContract = oc
  .route({ method: 'GET', path: '/progress/days' })
  .output(progressDaysSchema);

export const getProgressDayContract = oc
  .route({ method: 'GET', path: '/progress/day' })
  .input(getProgressDayInputSchema)
  .output(progressDayDetailSchema);

/** Calendar window for a period report (days you showed up). */
export const periodReportPeriodSchema = z.enum(['week', 'month', 'year']);

/** Calendar window for a single metric's totals. */
export const metricPeriodSchema = z.enum(['week', 'month', 'all']);

export const getPeriodReportInputSchema = z.object({
  period: periodReportPeriodSchema,
});

export const periodHighlightMetricSchema = z.object({
  metric: deviceMetricSchema,
  count: z.number().int().nonnegative(),
  unit: z.string().min(1),
});

export const periodReportSchema = z.object({
  period: periodReportPeriodSchema,
  /** Short label for the share poster top-right, such as "Oct 20–26". */
  periodLabel: z.string().min(1),
  /** Days with a rewarded daily finish in the window. */
  activeDays: z.number().int().nonnegative(),
  /** Strongest measured metric in the window, when any session exists. */
  highlight: periodHighlightMetricSchema.nullable(),
  startDayKey: dayKeySchema,
  endDayKey: dayKeySchema,
});

export const getMetricPeriodStatsInputSchema = z.object({
  metric: deviceMetricSchema,
  period: metricPeriodSchema,
});

export const metricPeriodBestDaySchema = z.object({
  dayKey: dayKeySchema,
  /** Total for this metric on that local day. */
  count: z.number().int().nonnegative(),
});

export const metricPeriodStatsSchema = z.object({
  metric: deviceMetricSchema,
  period: metricPeriodSchema,
  periodLabel: z.string().min(1),
  /** Reps, or minutes for a walk. */
  count: z.number().int().nonnegative(),
  unit: z.string().min(1),
  /** Distinct local days with at least one session of this metric. */
  activeDays: z.number().int().nonnegative(),
  /** Inclusive calendar days in the window (clamped to join day). */
  windowDays: z.number().int().positive(),
  /** Highest single-day total in the window; null when nothing was logged. */
  bestDay: metricPeriodBestDaySchema.nullable(),
  /** Floor of total ÷ window days. */
  avgPerDay: z.number().int().nonnegative(),
  startDayKey: dayKeySchema.nullable(),
  endDayKey: dayKeySchema,
});

export const getPeriodReportContract = oc
  .route({ method: 'GET', path: '/progress/period-report' })
  .input(getPeriodReportInputSchema)
  .output(periodReportSchema);

export const getMetricPeriodStatsContract = oc
  .route({ method: 'GET', path: '/progress/metric-stats' })
  .input(getMetricPeriodStatsInputSchema)
  .output(metricPeriodStatsSchema);

export type ProgressDayChallenge = z.infer<typeof progressDayChallengeSchema>;
export type ProgressDay = z.infer<typeof progressDaySchema>;
export type ProgressDays = z.infer<typeof progressDaysSchema>;
export type GetProgressDayInput = z.infer<typeof getProgressDayInputSchema>;
export type ProgressShareResult = z.infer<typeof progressShareResultSchema>;
export type ProgressDoneItem = z.infer<typeof progressDoneItemSchema>;
export type PhotoCheckResolution = z.infer<typeof photoCheckResolutionSchema>;
export type ProgressMissedPhotoCheck = z.infer<typeof progressMissedPhotoCheckSchema>;
export type ProgressPracticeItem = z.infer<typeof progressPracticeItemSchema>;
export type ProgressAdjustment = z.infer<typeof progressAdjustmentSchema>;
export type ProgressDayDetail = z.infer<typeof progressDayDetailSchema>;
export type PeriodReportPeriod = z.infer<typeof periodReportPeriodSchema>;
export type MetricPeriod = z.infer<typeof metricPeriodSchema>;
export type GetPeriodReportInput = z.infer<typeof getPeriodReportInputSchema>;
export type PeriodReport = z.infer<typeof periodReportSchema>;
export type GetMetricPeriodStatsInput = z.infer<typeof getMetricPeriodStatsInputSchema>;
export type MetricPeriodBestDay = z.infer<typeof metricPeriodBestDaySchema>;
export type MetricPeriodStats = z.infer<typeof metricPeriodStatsSchema>;
