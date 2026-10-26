import { oc } from '@orpc/contract';
import { z } from 'zod';
import { deviceMetricSchema } from './challenge-capture.js';

/** Which in-app sensor measured each kind of practice session. */
const PRACTICE_SOURCE_BY_METRIC = {
  pushups: 'in_app_pose',
  walk: 'in_app_gps',
  squats: 'in_app_pose',
  plank: 'in_app_pose',
  jumping_jacks: 'in_app_pose',
  burpees: 'in_app_pose',
  sit_ups: 'in_app_pose',
  mountain_climbers: 'in_app_pose',
  lunges: 'in_app_pose',
} as const;

/**
 * A sensor-measured session that is not a challenge's completion: an extra
 * push-up set after the daily one, or a set or walk that fell short of the
 * goal. Recorded as activity, and as progress on Today's card, but worth no
 * points and no streak, so repeat sessions cannot farm the economy.
 */
export const recordPracticeSessionInputSchema = z
  .object({
    metric: z.enum([
      'pushups',
      'walk',
      'squats',
      'plank',
      'jumping_jacks',
      'burpees',
      'sit_ups',
      'mountain_climbers',
      'lunges',
    ]),
    source: z.enum(['in_app_pose', 'in_app_gps']),
    /** Reps; required for push-ups, absent for a walk. */
    count: z.number().int().positive().max(200_000).optional(),
    durationSeconds: z.number().int().nonnegative().max(86_400),
    /** A walk's route length, when GPS measured one. */
    distanceMeters: z.number().int().nonnegative().max(200_000).optional(),
    startedAt: z.string().datetime(),
    endedAt: z.string().datetime(),
    /**
     * Client-generated, so a retried submit records one session, not two. A
     * walk saved again under the same id, after walking on, updates it.
     */
    externalId: z.string().min(1).max(128),
    /** The proof clip that filmed this set, so History can show it with the set. */
    proofClipId: z.string().min(1).optional(),
  })
  .superRefine((session, context) => {
    if (session.source !== PRACTICE_SOURCE_BY_METRIC[session.metric]) {
      context.addIssue({
        code: 'custom',
        path: ['source'],
        message: 'Source does not measure this metric',
      });
    }

    if (session.metric !== 'walk' && session.count === undefined) {
      context.addIssue({
        code: 'custom',
        path: ['count'],
        message: 'A set needs its count',
      });
    }

    if (
      session.metric === 'walk' &&
      (session.count !== undefined || session.durationSeconds === 0)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['durationSeconds'],
        message: 'A walk is measured in time',
      });
    }
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
export function practiceActivityReason(metric: z.infer<typeof deviceMetricSchema>): string {
  if (metric === 'pushups') {
    return 'Push-up practice';
  }

  return metric === 'walk' ? 'Walk' : 'Practice session';
}

export type RecordPracticeSessionInput = z.infer<typeof recordPracticeSessionInputSchema>;
export type RecordPracticeSessionOutput = z.infer<typeof recordPracticeSessionOutputSchema>;
export type PracticeSession = z.infer<typeof practiceSessionSchema>;
export type PracticeTotals = z.infer<typeof practiceTotalsSchema>;
