import type { DeviceActivity, DeviceMetric, HealthLinkStatus } from '@product/client';
import { Platform } from 'react-native';
import {
  aggregateLastNightSleep,
  lastNightSleepQueryBounds,
  type SleepInterval,
} from './sleep-health-aggregate';

export type DeviceSample = DeviceActivity & {
  label: string;
};

/** Last night's sleep from Apple Health or Health Connect (UI provenance only). */
export type SleepSample = {
  wentToBedAt: string;
  wokeUpAt: string;
  source: 'healthkit' | 'health_connect';
  durationMinutes: number;
  /** True when the store only had in-bed time, not asleep stages. */
  inBedOnly: boolean;
};

export const NATIVE_MOVEMENT_UNAVAILABLE =
  'This install cannot use location yet. Rebuild the iOS app, then try again. You can still confirm by hand.';

type LocationPermissionStatus = { GRANTED: string };

export type LocationModule = {
  PermissionStatus: LocationPermissionStatus;
  Accuracy: { Balanced: number; High: number };
  ActivityType?: { Fitness: number };
  requestForegroundPermissionsAsync: () => Promise<{ status: string }>;
  requestBackgroundPermissionsAsync?: () => Promise<{ status: string }>;
  hasStartedLocationUpdatesAsync?: (taskName: string) => Promise<boolean>;
  startLocationUpdatesAsync?: (
    taskName: string,
    options: {
      accuracy: number;
      distanceInterval: number;
      timeInterval: number;
      showsBackgroundLocationIndicator?: boolean;
      pausesUpdatesAutomatically?: boolean;
      activityType?: number;
      foregroundService?: {
        notificationTitle: string;
        notificationBody: string;
        notificationColor?: string;
      };
    },
  ) => Promise<void>;
  stopLocationUpdatesAsync?: (taskName: string) => Promise<void>;
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

export type PedometerModule = {
  isAvailableAsync: () => Promise<boolean>;
  getPermissionsAsync: () => Promise<{ granted: boolean }>;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  getStepCountAsync: (start: Date, end: Date) => Promise<{ steps: number }>;
  /** Live running total since the subscription started. */
  watchStepCount: (callback: (result: { steps: number }) => void) => {
    remove: () => void;
  };
};

/** Acceleration on each axis, in g, gravity included. */
export type AccelerometerSample = { x: number; y: number; z: number };

export type AccelerometerModule = {
  isAvailableAsync: () => Promise<boolean>;
  setUpdateInterval: (intervalMs: number) => void;
  addListener: (callback: (sample: AccelerometerSample) => void) => {
    remove: () => void;
  };
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

export async function loadPedometerModule(): Promise<PedometerModule | null> {
  try {
    const sensors = await import('expo-sensors');
    return sensors.Pedometer;
  } catch {
    return null;
  }
}

export async function loadAccelerometerModule(): Promise<AccelerometerModule | null> {
  try {
    const sensors = await import('expo-sensors');
    return sensors.Accelerometer;
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

  const locationResult = location ? await location.requestForegroundPermissionsAsync() : null;
  const motion = pedometer ? await pedometer.requestPermissionsAsync() : null;
  const granted =
    locationResult?.status === location?.PermissionStatus.GRANTED || Boolean(motion?.granted);

  return granted ? 'connected' : 'denied';
}

export async function readTodaySteps(options?: { ask?: boolean }): Promise<number | null> {
  const pedometer = await loadPedometerModule();
  if (!pedometer) {
    return null;
  }

  const available = await pedometer.isAvailableAsync();
  if (!available) {
    return null;
  }

  let permission = await pedometer.getPermissionsAsync();
  if (!permission.granted && options?.ask) {
    permission = await pedometer.requestPermissionsAsync();
  }
  if (!permission.granted) {
    return null;
  }

  const result = await pedometer.getStepCountAsync(startOfLocalDay(), new Date());
  return result.steps;
}

/**
 * Watch workouts from Apple Health / Health Connect are not wired yet.
 * The API already accepts those sources; this returns [] until workouts are
 * read from the same health-store stack. Phone GPS and the pedometer cover v1.
 */
export async function listTodayDeviceSamples(metric: DeviceMetric): Promise<DeviceSample[]> {
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

/** Asks Apple Health / Health Connect for sleep read access. Never writes. */
export async function requestSleepHealthAccess(): Promise<
  Extract<HealthLinkStatus, 'connected' | 'denied'>
> {
  if (Platform.OS === 'ios') {
    return requestHealthKitSleepAccess();
  }

  if (Platform.OS === 'android') {
    return requestHealthConnectSleepAccess();
  }

  return 'denied';
}

/**
 * Last night's sleep in the 18:00 yesterday → 12:00 today window, or null when
 * unauthorized, unavailable, or empty.
 */
export async function readLastNightSleep(now: Date = new Date()): Promise<SleepSample | null> {
  if (Platform.OS === 'ios') {
    return readHealthKitLastNightSleep(now);
  }

  if (Platform.OS === 'android') {
    return readHealthConnectLastNightSleep(now);
  }

  return null;
}

const HEALTHKIT_SLEEP_TYPE = 'HKCategoryTypeIdentifierSleepAnalysis' as const;

const HEALTHKIT_ASLEEP_VALUES = new Set([
  1, // asleepUnspecified / asleep
  3, // asleepCore
  4, // asleepDeep
  5, // asleepREM
]);
const HEALTHKIT_IN_BED_VALUE = 0;

async function requestHealthKitSleepAccess(): Promise<'connected' | 'denied'> {
  try {
    const healthkit = await import('@kingstinct/react-native-healthkit');
    const available = await healthkit.isHealthDataAvailableAsync();
    if (!available) {
      return 'denied';
    }

    await healthkit.requestAuthorization({ toRead: [HEALTHKIT_SLEEP_TYPE] });
    // HealthKit does not report read denial; a successful prompt counts as connected.
    return 'connected';
  } catch {
    return 'denied';
  }
}

async function readHealthKitLastNightSleep(now: Date): Promise<SleepSample | null> {
  try {
    const healthkit = await import('@kingstinct/react-native-healthkit');
    const available = await healthkit.isHealthDataAvailableAsync();
    if (!available) {
      return null;
    }

    const { start, end } = lastNightSleepQueryBounds(now);
    const samples = await healthkit.queryCategorySamples(HEALTHKIT_SLEEP_TYPE, {
      limit: 0,
      ascending: true,
      filter: {
        date: {
          startDate: start,
          endDate: end,
        },
      },
    });

    const intervals: SleepInterval[] = [];
    for (const sample of samples) {
      const startMs = sample.startDate.getTime();
      const endMs = sample.endDate.getTime();
      if (!(endMs > startMs)) {
        continue;
      }

      if (HEALTHKIT_ASLEEP_VALUES.has(sample.value)) {
        intervals.push({ startMs, endMs, kind: 'asleep' });
        continue;
      }

      if (sample.value === HEALTHKIT_IN_BED_VALUE) {
        intervals.push({ startMs, endMs, kind: 'in_bed' });
      }
    }

    const night = aggregateLastNightSleep(intervals);
    if (!night) {
      return null;
    }

    return {
      ...night,
      source: 'healthkit',
    };
  } catch {
    return null;
  }
}

const HEALTH_CONNECT_ASLEEP_STAGES = new Set([
  2, // SLEEPING
  4, // LIGHT
  5, // DEEP
  6, // REM
]);

async function requestHealthConnectSleepAccess(): Promise<'connected' | 'denied'> {
  try {
    const healthConnect = await import('react-native-health-connect');
    const ready = await healthConnect.initialize();
    if (!ready) {
      return 'denied';
    }

    const granted = await healthConnect.requestPermission([
      { accessType: 'read', recordType: 'SleepSession' },
    ]);
    const allowed = granted.some(
      (permission) =>
        'recordType' in permission &&
        permission.recordType === 'SleepSession' &&
        permission.accessType === 'read',
    );
    return allowed ? 'connected' : 'denied';
  } catch {
    return 'denied';
  }
}

async function readHealthConnectLastNightSleep(now: Date): Promise<SleepSample | null> {
  try {
    const healthConnect = await import('react-native-health-connect');
    const ready = await healthConnect.initialize();
    if (!ready) {
      return null;
    }

    const { start, end } = lastNightSleepQueryBounds(now);
    const { records } = await healthConnect.readRecords('SleepSession', {
      timeRangeFilter: {
        operator: 'between',
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      },
    });

    const intervals: SleepInterval[] = [];
    for (const record of records) {
      const stages = record.stages ?? [];
      if (stages.length === 0) {
        const startMs = Date.parse(record.startTime);
        const endMs = Date.parse(record.endTime);
        if (endMs > startMs) {
          intervals.push({ startMs, endMs, kind: 'asleep' });
        }
        continue;
      }

      let hasAsleep = false;
      for (const stage of stages) {
        if (!HEALTH_CONNECT_ASLEEP_STAGES.has(stage.stage)) {
          continue;
        }
        const startMs = Date.parse(stage.startTime);
        const endMs = Date.parse(stage.endTime);
        if (!(endMs > startMs)) {
          continue;
        }
        hasAsleep = true;
        intervals.push({ startMs, endMs, kind: 'asleep' });
      }

      if (!hasAsleep) {
        const startMs = Date.parse(record.startTime);
        const endMs = Date.parse(record.endTime);
        if (endMs > startMs) {
          intervals.push({ startMs, endMs, kind: 'in_bed' });
        }
      }
    }

    const night = aggregateLastNightSleep(intervals);
    if (!night) {
      return null;
    }

    return {
      ...night,
      source: 'health_connect',
    };
  } catch {
    return null;
  }
}
