import { z } from 'zod';
import {
  challengeCarbsSchema,
  challengeGlucoseSchema,
  challengePeakFlowSchema,
  challengeWaterSchema,
  deviceMetricSchema,
  type ChallengeHistoryEvidence,
  type ChallengeHistoryLog,
  type ChallengeHistoryOutcome,
} from '@product/contract';

export const CHALLENGE_HISTORY_LIMIT = 50;

const storedLogSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('glucose'), fields: challengeGlucoseSchema }),
  z.object({ kind: z.literal('peak_flow'), fields: challengePeakFlowSchema }),
  z.object({ kind: z.literal('water'), fields: challengeWaterSchema }),
  z.object({ kind: z.literal('carbs'), fields: challengeCarbsSchema }),
]);

export function historyOutcome(
  outcome: string | null | undefined,
): ChallengeHistoryOutcome {
  return outcome === 'penalized' ? 'penalized' : 'rewarded';
}

export function historyEvidence(
  status: string | null | undefined,
): ChallengeHistoryEvidence | null {
  if (status === 'submitted' || status === 'skipped' || status === 'expired') {
    return status;
  }

  return null;
}

export function historyLog(input: {
  completionKind: string;
  vitalReading: {
    systolic: number;
    diastolic: number;
    pulse: number | null;
    notes: string | null;
  } | null;
  challengeLogPayload: unknown;
  deviceActivity: {
    metric: string;
    durationSeconds: number | null;
    distanceMeters: number | null;
    count: number | null;
  } | null;
}): ChallengeHistoryLog | null {
  if (input.vitalReading) {
    return {
      kind: 'vitals_bp',
      systolic: input.vitalReading.systolic,
      diastolic: input.vitalReading.diastolic,
      pulse: input.vitalReading.pulse,
      notes: input.vitalReading.notes,
    };
  }

  const stored = storedLogSchema.safeParse(input.challengeLogPayload);
  if (stored.success) {
    if (stored.data.kind === 'glucose') {
      return { kind: 'glucose', ...stored.data.fields };
    }

    if (stored.data.kind === 'peak_flow') {
      return { kind: 'peak_flow', ...stored.data.fields };
    }

    if (stored.data.kind === 'water') {
      return { kind: 'water', ...stored.data.fields };
    }

    return {
      kind: 'carbs',
      grams: stored.data.fields.grams ?? null,
      note: stored.data.fields.note ?? null,
    };
  }

  if (input.deviceActivity) {
    const metric = deviceMetricSchema.safeParse(input.deviceActivity.metric);
    if (metric.success) {
      return {
        kind: 'device',
        metric: metric.data,
        durationSeconds: input.deviceActivity.durationSeconds,
        distanceMeters: input.deviceActivity.distanceMeters,
        count: input.deviceActivity.count,
      };
    }
  }

  if (input.completionKind === 'evidence_photo') {
    return { kind: 'evidence_photo' };
  }

  if (input.completionKind === 'check_in') {
    return { kind: 'check_in' };
  }

  return null;
}
