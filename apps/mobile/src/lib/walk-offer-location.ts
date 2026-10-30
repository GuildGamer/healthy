import type { GeoPoint } from '@/lib/geo-session';

/** Separate from the active walk recorder so both never share a task name. */
export const WALK_OFFER_LOCATION_TASK = 'healthy-walk-offer';

type WalkOfferLocationListener = (fixes: readonly GeoPoint[]) => void;

let listener: WalkOfferLocationListener | null = null;

export function setWalkOfferLocationListener(next: WalkOfferLocationListener | null): void {
  listener = next;
}

function toFixes(
  locations: ReadonlyArray<{
    coords: { latitude: number; longitude: number };
    timestamp: number;
  }>,
): GeoPoint[] {
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
export function defineWalkOfferLocationTask(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const TaskManager = require('expo-task-manager') as {
      defineTask: (
        name: string,
        handler: (body: {
          data?: {
            locations?: ReadonlyArray<{
              coords: { latitude: number; longitude: number };
              timestamp: number;
            }>;
          };
          error?: { message: string } | null;
        }) => void,
      ) => void;
      isTaskDefined: (name: string) => boolean;
    };

    if (TaskManager.isTaskDefined(WALK_OFFER_LOCATION_TASK)) {
      return;
    }

    TaskManager.defineTask(WALK_OFFER_LOCATION_TASK, ({ data, error }) => {
      if (error || !data?.locations || data.locations.length === 0) {
        return;
      }

      listener?.(toFixes(data.locations));
    });
  } catch {
    // Task Manager missing from this binary — offer monitor stays off.
  }
}

defineWalkOfferLocationTask();
