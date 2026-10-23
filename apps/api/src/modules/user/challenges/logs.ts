import { ORPCError } from '@orpc/server';
import {
  challengeCarbsSchema,
  challengeGlucoseSchema,
  challengePeakFlowSchema,
  challengeSleepSchema,
  challengeWaterSchema,
  type ChallengeCapture,
  type ChallengeCarbs,
  type ChallengeGlucose,
  type ChallengePeakFlow,
  type ChallengeSleep,
  type ChallengeWater,
} from '@product/contract';
import type { ChallengeCompletionKind } from '@product/db';

/** Five minutes of clock skew when checking a wake time is not in the future. */
const WAKE_FUTURE_TOLERANCE_MS = 5 * 60 * 1000;
/** A wake time older than this is not "last night". */
const WAKE_MAX_AGE_MS = 36 * 60 * 60 * 1000;

export type ChallengeLogPayload =
  | { kind: 'glucose'; fields: ChallengeGlucose }
  | { kind: 'peak_flow'; fields: ChallengePeakFlow }
  | { kind: 'water'; fields: ChallengeWater }
  | { kind: 'carbs'; fields: ChallengeCarbs }
  | { kind: 'sleep'; fields: ChallengeSleep };

export function requireLogFor(
  completionKind: ChallengeCompletionKind,
  input: {
    glucose?: ChallengeGlucose;
    peakFlow?: ChallengePeakFlow;
    water?: ChallengeWater;
    carbs?: ChallengeCarbs;
  },
): ChallengeLogPayload | null {
  if (completionKind === 'glucose') {
    const parsed = challengeGlucoseSchema.safeParse(input.glucose);
    if (!parsed.success) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Log your glucose reading to finish this challenge',
      });
    }

    return { kind: 'glucose', fields: parsed.data };
  }

  if (completionKind === 'peak_flow') {
    const parsed = challengePeakFlowSchema.safeParse(input.peakFlow);
    if (!parsed.success) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Log your best peak-flow reading to finish this challenge',
      });
    }

    return { kind: 'peak_flow', fields: parsed.data };
  }

  if (completionKind === 'water') {
    const parsed = challengeWaterSchema.safeParse(input.water);
    if (!parsed.success) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Log your water intake to finish this challenge',
      });
    }

    return { kind: 'water', fields: parsed.data };
  }

  if (completionKind === 'carbs') {
    const parsed = challengeCarbsSchema.safeParse(input.carbs);
    if (!parsed.success) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Log carbohydrates as grams or a short note to finish',
      });
    }

    return { kind: 'carbs', fields: parsed.data };
  }

  return null;
}

/**
 * Sleep is keyed on capture.metric, not completionKind, so older apps that
 * still send a plain check-in keep working. A missing sleep entry is allowed;
 * a sleep entry on the wrong challenge is not.
 */
export function requireSleepLogFor(
  capture: ChallengeCapture,
  sleep: ChallengeSleep | undefined,
  now: Date = new Date(),
): ChallengeLogPayload | null {
  if (capture.metric !== 'sleep') {
    if (sleep !== undefined) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'This challenge does not accept a sleep log',
      });
    }

    return null;
  }

  if (sleep === undefined) {
    return null;
  }

  const parsed = challengeSleepSchema.safeParse(sleep);
  if (!parsed.success) {
    throw new ORPCError('BAD_REQUEST', {
      message: parsed.error.issues[0]?.message ?? 'Log your bedtime and wake time to finish',
    });
  }

  const wokeUpAt = Date.parse(parsed.data.wokeUpAt);
  const ageMs = now.getTime() - wokeUpAt;
  if (ageMs < -WAKE_FUTURE_TOLERANCE_MS) {
    throw new ORPCError('BAD_REQUEST', {
      message: 'Wake time cannot be in the future',
    });
  }

  if (ageMs > WAKE_MAX_AGE_MS) {
    throw new ORPCError('BAD_REQUEST', {
      message: 'That wake time is too old for last night’s sleep',
    });
  }

  return { kind: 'sleep', fields: parsed.data };
}
