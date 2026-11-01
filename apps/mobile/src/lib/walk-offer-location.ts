import { ingestWalkOfferFixes } from '@/lib/walk-offer-ingest';
import type { GeoPoint } from '@/lib/geo-session';

/** Separate from the active walk recorder so both never share a task name. */
export const WALK_OFFER_LOCATION_TASK = 'healthy-walk-offer';

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
 *
 * Accumulation lives in the task (via the persisted session) so Android's
 * separate JS context and an iOS wake still count the bout.
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
        }) => void | Promise<void>,
      ) => void;
      isTaskDefined: (name: string) => boolean;
    };

    if (TaskManager.isTaskDefined(WALK_OFFER_LOCATION_TASK)) {
      return;
    }

    TaskManager.defineTask(WALK_OFFER_LOCATION_TASK, async ({ data, error }) => {
      if (error || !data?.locations || data.locations.length === 0) {
        return;
      }

      await ingestWalkOfferFixes(toFixes(data.locations));
    });
  } catch {
    // Task Manager missing from this binary — offer monitor stays off.
  }
}

defineWalkOfferLocationTask();
