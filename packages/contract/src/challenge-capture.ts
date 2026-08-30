import { z } from 'zod';

export const challengeCaptureKindSchema = z.enum([
  'self_report',
  'structured_log',
  'photo',
  'device_sample',
  'device_session',
]);

export const deviceMetricSchema = z.enum([
  'walk',
  'run',
  'cycle',
  'steps',
  'sleep',
  'weight',
  'heart_rate',
]);

export const deviceActivitySourceSchema = z.enum([
  'healthkit',
  'health_connect',
  'in_app_gps',
  'pedometer',
  'manual',
]);

export const healthLinkStatusSchema = z.enum([
  'unknown',
  'connected',
  'denied',
]);

export const challengeTargetSchema = z.object({
  durationMinutes: z.number().int().positive().nullable(),
  distanceMeters: z.number().int().positive().nullable(),
  count: z.number().int().positive().nullable(),
});

export const challengeCaptureSchema = z.object({
  kind: challengeCaptureKindSchema,
  metric: deviceMetricSchema.nullable(),
  target: challengeTargetSchema,
});

export const deviceActivitySchema = z.object({
  source: deviceActivitySourceSchema,
  metric: deviceMetricSchema,
  durationSeconds: z.number().int().nonnegative().max(86_400).optional(),
  distanceMeters: z.number().int().nonnegative().max(200_000).optional(),
  count: z.number().int().nonnegative().max(200_000).optional(),
  startedAt: z.string().datetime().optional(),
  endedAt: z.string().datetime().optional(),
  externalId: z.string().min(1).max(128).optional(),
});

export const updateHealthLinkInputSchema = z.object({
  status: z.enum(['connected', 'denied']),
});

export const emptyChallengeTarget = {
  durationMinutes: null,
  distanceMeters: null,
  count: null,
} as const;

export const selfReportCapture = {
  kind: 'self_report',
  metric: null,
  target: emptyChallengeTarget,
} as const;

export type ChallengeCaptureKind = z.infer<typeof challengeCaptureKindSchema>;
export type DeviceMetric = z.infer<typeof deviceMetricSchema>;
export type DeviceActivitySource = z.infer<typeof deviceActivitySourceSchema>;
export type HealthLinkStatus = z.infer<typeof healthLinkStatusSchema>;
export type ChallengeTarget = z.infer<typeof challengeTargetSchema>;
export type ChallengeCapture = z.infer<typeof challengeCaptureSchema>;
export type DeviceActivity = z.infer<typeof deviceActivitySchema>;
export type UpdateHealthLinkInput = z.infer<typeof updateHealthLinkInputSchema>;

export function isDeviceCapture(kind: ChallengeCaptureKind): boolean {
  return kind === 'device_sample' || kind === 'device_session';
}

export function activityMeetsTarget(
  activity: DeviceActivity,
  target: ChallengeTarget,
): boolean {
  if (activity.source === 'manual') {
    return true;
  }

  if (
    target.durationMinutes !== null &&
    (activity.durationSeconds ?? 0) < target.durationMinutes * 60
  ) {
    return false;
  }

  if (
    target.distanceMeters !== null &&
    (activity.distanceMeters ?? 0) < target.distanceMeters
  ) {
    return false;
  }

  if (target.count !== null && (activity.count ?? 0) < target.count) {
    return false;
  }

  return true;
}

export function toChallengeCapture(input: {
  captureKind?: ChallengeCaptureKind | string | null;
  deviceMetric?: DeviceMetric | string | null;
  targetDurationMinutes?: number | null;
  targetDistanceMeters?: number | null;
  targetCount?: number | null;
  completionKind?: string;
}): ChallengeCapture {
  const kind = challengeCaptureKindSchema.safeParse(input.captureKind);
  const metric = deviceMetricSchema.safeParse(input.deviceMetric);

  return {
    kind: kind.success
      ? kind.data
      : defaultCaptureKindFor(input.completionKind ?? 'check_in'),
    metric: metric.success ? metric.data : null,
    target: {
      durationMinutes: input.targetDurationMinutes ?? null,
      distanceMeters: input.targetDistanceMeters ?? null,
      count: input.targetCount ?? null,
    },
  };
}

export function defaultCaptureKindFor(
  completionKind: string,
): ChallengeCaptureKind {
  if (completionKind === 'evidence_photo') {
    return 'photo';
  }

  if (
    completionKind === 'vitals_bp' ||
    completionKind === 'glucose' ||
    completionKind === 'peak_flow' ||
    completionKind === 'water' ||
    completionKind === 'carbs'
  ) {
    return 'structured_log';
  }

  return 'self_report';
}
