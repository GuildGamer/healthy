import { ORPCError } from '@orpc/server';
import {
  challengeCarbsSchema,
  challengeGlucoseSchema,
  challengePeakFlowSchema,
  challengeWaterSchema,
  type ChallengeCarbs,
  type ChallengeGlucose,
  type ChallengePeakFlow,
  type ChallengeWater,
} from '@product/contract';
import type { ChallengeCompletionKind } from '@product/db';

export type ChallengeLogPayload =
  | { kind: 'glucose'; fields: ChallengeGlucose }
  | { kind: 'peak_flow'; fields: ChallengePeakFlow }
  | { kind: 'water'; fields: ChallengeWater }
  | { kind: 'carbs'; fields: ChallengeCarbs };

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
