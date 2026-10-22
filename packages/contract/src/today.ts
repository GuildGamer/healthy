import { oc } from '@orpc/contract';
import { z } from 'zod';

const dayKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/**
 * What a card on Today needs beyond the occurrence itself. Every value is the
 * member's own, and none of them is a logged reading: a blood-pressure card
 * learns when it was last done, never what it said.
 */
export const todayOccurrenceDetailSchema = z.object({
  userChallengeId: z.string().min(1),
  /**
   * Local day this challenge was last finished, before the occurrence on the
   * card. Null when it never has been.
   */
  lastCompletedDayKey: dayKeySchema.nullable(),
  /**
   * The best single sensor-measured session of the challenge's activity in
   * the occurrence's period, in the unit its target counts: minutes for a
   * duration, reps or steps for a count, metres for a distance. Null when
   * nothing was measured or the challenge has no measured target. A target is
   * met by one session, so this is the best one rather than a sum.
   */
  bestMeasuredInPeriod: z.number().int().nonnegative().nullable(),
  /**
   * Local days of the current week, Monday first, on which the challenge was
   * finished or its activity was measured by a sensor.
   */
  activeDayKeys: z.array(dayKeySchema),
  /** When the occurrence on the card was finished. Null until it is. */
  completedAt: z.string().datetime().nullable(),
});

export const todayDetailsSchema = z.object({
  dayKey: dayKeySchema,
  /** The Monday of the member's current week, in their zone. */
  weekStartKey: dayKeySchema,
  occurrences: z.array(todayOccurrenceDetailSchema),
});

export const getTodayDetailsContract = oc
  .route({ method: 'GET', path: '/today/details' })
  .output(todayDetailsSchema);

export type TodayOccurrenceDetail = z.infer<typeof todayOccurrenceDetailSchema>;
export type TodayDetails = z.infer<typeof todayDetailsSchema>;
