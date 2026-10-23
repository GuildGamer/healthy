import type { GeoPoint } from '@/lib/geo-session';

/**
 * Named so a deferred task that wakes the app can find the same registration
 * the walk recorder started under.
 */
export const WALK_LOCATION_TASK = 'healthy-walk-location';

export type WalkLocationFix = GeoPoint;

type WalkLocationListener = (fixes: readonly WalkLocationFix[]) => void;

let listener: WalkLocationListener | null = null;

/**
 * The background task only delivers fixes. The recorder owns distance, the
 * clock, and the lock-screen card.
 */
export function setWalkLocationListener(next: WalkLocationListener | null): void {
  listener = next;
}

function toFixes(
  locations: ReadonlyArray<{
    coords: { latitude: number; longitude: number };
    timestamp: number;
  }>,
): WalkLocationFix[] {
  return locations.map((location) => ({
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    recordedAt: location.timestamp,
  }));
}

/**
 * Must run at module load so a location wake can find the handler before any
 * screen mounts. Safe to call more than once.
 */
export function defineWalkLocationTask(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const TaskManager = require('expo-task-manager') as {
      defineTask: (
        name: string,
        handler: (body: {
          data?: { locations?: ReadonlyArray<{
            coords: { latitude: number; longitude: number };
            timestamp: number;
          }> };
          error?: { message: string } | null;
        }) => void,
      ) => void;
      isTaskDefined: (name: string) => boolean;
    };

    if (TaskManager.isTaskDefined(WALK_LOCATION_TASK)) {
      return;
    }

    TaskManager.defineTask(WALK_LOCATION_TASK, ({ data, error }) => {
      if (error || !data?.locations || data.locations.length === 0) {
        return;
      }

      listener?.(toFixes(data.locations));
    });
  } catch {
    // Task Manager is missing from this binary. Foreground walks still work.
  }
}

defineWalkLocationTask();
