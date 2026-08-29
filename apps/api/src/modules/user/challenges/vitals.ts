import { ORPCError } from '@orpc/server';
import type { ChallengeCompletionKind } from '@product/db';

export type ChallengeVitalsInput = {
  systolic: number;
  diastolic: number;
  pulse?: number;
  notes?: string;
};

const SYSTOLIC_MIN = 50;
const SYSTOLIC_MAX = 250;
const DIASTOLIC_MIN = 30;
const DIASTOLIC_MAX = 180;
const PULSE_MIN = 30;
const PULSE_MAX = 220;

export function requireVitalsFor(
  completionKind: ChallengeCompletionKind,
  vitals: ChallengeVitalsInput | undefined,
): ChallengeVitalsInput | null {
  if (completionKind !== 'vitals_bp') {
    return null;
  }

  if (!vitals) {
    throw new ORPCError('BAD_REQUEST', {
      message: 'Log your blood pressure to finish this challenge',
    });
  }

  if (
    vitals.systolic < SYSTOLIC_MIN ||
    vitals.systolic > SYSTOLIC_MAX ||
    vitals.diastolic < DIASTOLIC_MIN ||
    vitals.diastolic > DIASTOLIC_MAX
  ) {
    throw new ORPCError('BAD_REQUEST', {
      message: 'That reading looks outside a plausible range',
    });
  }

  if (
    vitals.pulse !== undefined &&
    (vitals.pulse < PULSE_MIN || vitals.pulse > PULSE_MAX)
  ) {
    throw new ORPCError('BAD_REQUEST', {
      message: 'Pulse must be a plausible beats-per-minute value',
    });
  }

  return vitals;
}
