import type { DeviceActivity } from '@product/client';

/** Same shape as DeviceSample in device-health — kept local to avoid a cycle. */
export type WalkDeviceSample = DeviceActivity & { label: string };

/** HealthKit workout activity types we treat as a walk challenge bout. */
export const HEALTHKIT_WALK_ACTIVITY_TYPES = new Set([
  52, // walking
  24, // hiking
]);

/** Health Connect ExerciseType values we treat as a walk challenge bout. */
export const HEALTH_CONNECT_WALK_EXERCISE_TYPES = new Set([
  79, // WALKING
  37, // HIKING
]);

export type WalkWorkoutInput = {
  source: Extract<DeviceActivity['source'], 'healthkit' | 'health_connect'>;
  externalId: string;
  startedAt: Date;
  endedAt: Date;
  /** Wall-clock duration in seconds when the store provides it; else derived. */
  durationSeconds?: number;
  distanceMeters?: number | null;
};

/**
 * Turns a finished health-store workout into a DeviceSample, or null when the
 * times are unusable. Duration prefers the store value, then end − start.
 */
export function deviceSampleFromWalkWorkout(input: WalkWorkoutInput): WalkDeviceSample | null {
  const startMs = input.startedAt.getTime();
  const endMs = input.endedAt.getTime();
  if (!(endMs > startMs) || !Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    return null;
  }

  const derivedSeconds = Math.round((endMs - startMs) / 1_000);
  const durationSeconds = Math.max(
    0,
    Math.round(input.durationSeconds ?? derivedSeconds),
  );
  if (durationSeconds <= 0) {
    return null;
  }

  const externalId = input.externalId.trim().slice(0, 128);
  if (externalId.length === 0) {
    return null;
  }

  const distanceMeters =
    input.distanceMeters != null && Number.isFinite(input.distanceMeters)
      ? Math.max(0, Math.round(input.distanceMeters))
      : undefined;

  const minutes = Math.max(1, Math.round(durationSeconds / 60));
  const storeLabel = input.source === 'healthkit' ? 'Apple Health' : 'Health Connect';

  return {
    source: input.source,
    metric: 'walk',
    durationSeconds,
    ...(distanceMeters !== undefined ? { distanceMeters } : {}),
    startedAt: new Date(startMs).toISOString(),
    endedAt: new Date(endMs).toISOString(),
    externalId,
    label: `${minutes} min walk from ${storeLabel}`,
  };
}

/** Longest bout first so FoundWalkCard prefers the best qualifying sample. */
export function sortWalkSamplesLongestFirst(
  samples: readonly WalkDeviceSample[],
): WalkDeviceSample[] {
  return [...samples].sort(
    (left, right) => (right.durationSeconds ?? 0) - (left.durationSeconds ?? 0),
  );
}

export function isHealthKitWalkActivityType(activityType: number): boolean {
  return HEALTHKIT_WALK_ACTIVITY_TYPES.has(activityType);
}

export function isHealthConnectWalkExerciseType(exerciseType: number): boolean {
  return HEALTH_CONNECT_WALK_EXERCISE_TYPES.has(exerciseType);
}
