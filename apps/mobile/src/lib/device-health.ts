import type { DeviceActivity, DeviceMetric, HealthLinkStatus } from '@product/client';

export type DeviceSample = DeviceActivity & {
  label: string;
};

export const NATIVE_MOVEMENT_UNAVAILABLE =
  'This install cannot use location yet. Rebuild the iOS app, then try again. You can still confirm by hand.';

type LocationPermissionStatus = { GRANTED: string };

type LocationModule = {
  PermissionStatus: LocationPermissionStatus;
  Accuracy: { Balanced: number };
  requestForegroundPermissionsAsync: () => Promise<{ status: string }>;
  watchPositionAsync: (
    options: {
      accuracy: number;
      distanceInterval: number;
      timeInterval: number;
    },
    callback: (location: {
      coords: { latitude: number; longitude: number };
      timestamp: number;
    }) => void,
  ) => Promise<{ remove: () => void }>;
};

type PedometerModule = {
  isAvailableAsync: () => Promise<boolean>;
  getPermissionsAsync: () => Promise<{ granted: boolean }>;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  getStepCountAsync: (
    start: Date,
    end: Date,
  ) => Promise<{ steps: number }>;
};

export function startOfLocalDay(at: Date = new Date()): Date {
  const start = new Date(at);
  start.setHours(0, 0, 0, 0);
  return start;
}

export async function loadLocationModule(): Promise<LocationModule | null> {
  try {
    return (await import('expo-location')) as LocationModule;
  } catch {
    return null;
  }
}

async function loadPedometerModule(): Promise<PedometerModule | null> {
  try {
    const sensors = await import('expo-sensors');
    return sensors.Pedometer;
  } catch {
    return null;
  }
}

export async function requestMovementAccess(): Promise<
  Extract<HealthLinkStatus, 'connected' | 'denied'>
> {
  const location = await loadLocationModule();
  const pedometer = await loadPedometerModule();

  if (!location && !pedometer) {
    throw new Error(NATIVE_MOVEMENT_UNAVAILABLE);
  }

  const locationResult = location
    ? await location.requestForegroundPermissionsAsync()
    : null;
  const motion = pedometer ? await pedometer.requestPermissionsAsync() : null;
  const granted =
    locationResult?.status === location?.PermissionStatus.GRANTED ||
    Boolean(motion?.granted);

  return granted ? 'connected' : 'denied';
}

export async function readTodaySteps(): Promise<number | null> {
  const pedometer = await loadPedometerModule();
  if (!pedometer) {
    return null;
  }

  const available = await pedometer.isAvailableAsync();
  if (!available) {
    return null;
  }

  const permission = await pedometer.getPermissionsAsync();
  if (!permission.granted) {
    return null;
  }

  const result = await pedometer.getStepCountAsync(
    startOfLocalDay(),
    new Date(),
  );
  return result.steps;
}

/**
 * Watch workouts from Apple Health / Health Connect are not wired yet.
 * The API already accepts those sources; this returns [] until the native
 * Health module is added. Phone GPS and the pedometer cover v1.
 */
export async function listTodayDeviceSamples(
  metric: DeviceMetric,
): Promise<DeviceSample[]> {
  if (metric !== 'steps') {
    return [];
  }

  const steps = await readTodaySteps();
  if (steps === null) {
    return [];
  }

  return [
    {
      source: 'pedometer',
      metric: 'steps',
      count: steps,
      startedAt: startOfLocalDay().toISOString(),
      endedAt: new Date().toISOString(),
      externalId: `pedometer:${startOfLocalDay().toISOString().slice(0, 10)}`,
      label: `${steps.toLocaleString('en-GB')} steps on this phone today`,
    },
  ];
}
