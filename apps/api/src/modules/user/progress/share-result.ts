import {
  challengeWaterSchema,
  deviceMetricSchema,
  type ProgressShareResult,
} from '@product/contract';
import { z } from 'zod';

const MINUTE_METRICS = new Set(['walk', 'run', 'cycle']);

const waterLogSchema = z.object({
  kind: z.literal('water'),
  fields: challengeWaterSchema,
});

export type ShareResultInput = {
  completionKind: string;
  deviceActivity: {
    metric: string;
    durationSeconds: number | null;
    count: number | null;
  } | null;
  challengeLogPayload: unknown;
};

/**
 * Reps, minutes, glasses, or a gym check-in. A reading payload is ignored,
 * so its numbers never reach a day detail or a share image.
 */
export function shareResultFor(input: ShareResultInput): ProgressShareResult | null {
  if (input.completionKind === 'evidence_photo') {
    return { kind: 'gym' };
  }

  return deviceResult(input.deviceActivity) ?? glassResult(input.challengeLogPayload);
}

function deviceResult(activity: ShareResultInput['deviceActivity']): ProgressShareResult | null {
  if (!activity) {
    return null;
  }

  const metric = deviceMetricSchema.safeParse(activity.metric);
  if (!metric.success) {
    return null;
  }

  if (metric.data === 'pushups' && activity.count != null) {
    return { kind: 'reps', count: activity.count };
  }

  if (!MINUTE_METRICS.has(metric.data) || activity.durationSeconds == null) {
    return null;
  }

  if (activity.durationSeconds <= 0) {
    return null;
  }

  return { kind: 'minutes', minutes: Math.max(1, Math.floor(activity.durationSeconds / 60)) };
}

function glassResult(payload: unknown): ProgressShareResult | null {
  const water = waterLogSchema.safeParse(payload);
  if (!water.success || water.data.fields.unit !== 'glasses') {
    return null;
  }

  return { kind: 'glasses', count: water.data.fields.amount };
}
