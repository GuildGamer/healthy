import { oc } from '@orpc/contract';
import { z } from 'zod';
import { deviceMetricSchema } from './challenge-capture.js';

/**
 * A push-up set the user did outside their daily challenge — after finishing
 * it, or instead of it. Recorded as activity and shareable, but deliberately
 * worth no points and no streak, so repeat sets cannot farm the economy.
 */
export const recordPracticeSessionInputSchema = z.object({
  metric: z.literal('pushups'),
  source: z.literal('in_app_pose'),
  count: z.number().int().positive().max(200_000),
  durationSeconds: z.number().int().nonnegative().max(86_400),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime(),
  /** Client-generated, so a retried submit records one session, not two. */
  externalId: z.string().min(1).max(128),
});

export const practiceSessionSchema = z.object({
  id: z.string().min(1),
  metric: deviceMetricSchema,
  count: z.number().int().nonnegative(),
  durationSeconds: z.number().int().nonnegative(),
  recordedAt: z.string().datetime(),
});

export const practiceTotalsSchema = z.object({
  /** Reps across every practice session in the user's local day. */
  todayCount: z.number().int().nonnegative(),
  todaySessions: z.number().int().nonnegative(),
});

export const recordPracticeSessionOutputSchema = z.object({
  session: practiceSessionSchema,
  totals: practiceTotalsSchema,
});

export const practiceTotalsInputSchema = z.object({
  metric: deviceMetricSchema,
});

export const recordPracticeSessionContract = oc
  .route({ method: 'POST', path: '/practice-sessions' })
  .input(recordPracticeSessionInputSchema)
  .output(recordPracticeSessionOutputSchema);

export const getPracticeTotalsContract = oc
  .route({ method: 'GET', path: '/practice-sessions/totals' })
  .input(practiceTotalsInputSchema)
  .output(practiceTotalsSchema);

/** Row label for a practice session wherever activity is listed. */
export function practiceActivityReason(
  metric: z.infer<typeof deviceMetricSchema>,
): string {
  return metric === 'pushups' ? 'Push-up practice' : 'Practice session';
}

export type RecordPracticeSessionInput = z.infer<
  typeof recordPracticeSessionInputSchema
>;
export type RecordPracticeSessionOutput = z.infer<
  typeof recordPracticeSessionOutputSchema
>;
export type PracticeSession = z.infer<typeof practiceSessionSchema>;
export type PracticeTotals = z.infer<typeof practiceTotalsSchema>;
