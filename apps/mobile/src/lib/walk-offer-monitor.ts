import { WALK_OFFER_FOREGROUND_SERVICE } from '@/lib/walk-offer-copy';
import type { OpenWalkOfferGoal } from '@/lib/walk-offer-goal';
import { ingestWalkOfferFixes, setWalkOfferAfterPrompt } from '@/lib/walk-offer-ingest';
import { WALK_OFFER_LOCATION_TASK } from '@/lib/walk-offer-location';
import {
  clearWalkOfferSession,
  ensureWalkOfferSession,
  localWalkOfferDayKey,
  readWalkOfferSession,
} from '@/lib/walk-offer-session';
import {
  readWalkOfferRecord,
  walkOfferAlreadyHandled,
  writeWalkOfferRecord,
} from '@/lib/walk-offer-state';
import { loadLocationModule, type LocationModule } from '@/lib/device-health';

const OFFER_DISTANCE_INTERVAL_METERS = 15;
const OFFER_TIME_INTERVAL_MS = 15_000;

let armedGoal: OpenWalkOfferGoal | null = null;
let foregroundWatch: { remove: () => void } | null = null;

export function isWalkOfferArmed(): boolean {
  return armedGoal !== null;
}

export function getArmedWalkOfferGoal(): OpenWalkOfferGoal | null {
  return armedGoal;
}

async function stopBackgroundUpdates(location: LocationModule): Promise<void> {
  if (!location.hasStartedLocationUpdatesAsync || !location.stopLocationUpdatesAsync) {
    return;
  }

  try {
    const running = await location.hasStartedLocationUpdatesAsync(WALK_OFFER_LOCATION_TASK);
    if (running) {
      await location.stopLocationUpdatesAsync(WALK_OFFER_LOCATION_TASK);
    }
  } catch {
    // Already stopped.
  }
}

function stopForegroundWatch(): void {
  foregroundWatch?.remove();
  foregroundWatch = null;
}

async function startBackgroundUpdates(location: LocationModule): Promise<boolean> {
  if (!location.startLocationUpdatesAsync) {
    return false;
  }

  try {
    const background = location.requestBackgroundPermissionsAsync
      ? await location.requestBackgroundPermissionsAsync()
      : null;
    if (background && background.status !== location.PermissionStatus.GRANTED) {
      return false;
    }

    await location.startLocationUpdatesAsync(WALK_OFFER_LOCATION_TASK, {
      accuracy: location.Accuracy.Balanced,
      distanceInterval: OFFER_DISTANCE_INTERVAL_METERS,
      timeInterval: OFFER_TIME_INTERVAL_MS,
      showsBackgroundLocationIndicator: false,
      pausesUpdatesAutomatically: false,
      activityType: location.ActivityType?.Fitness,
      foregroundService: { ...WALK_OFFER_FOREGROUND_SERVICE },
    });
    return true;
  } catch {
    return false;
  }
}

async function startForegroundWatch(location: LocationModule): Promise<boolean> {
  try {
    stopForegroundWatch();
    const watch = await location.watchPositionAsync(
      {
        accuracy: location.Accuracy.Balanced,
        distanceInterval: OFFER_DISTANCE_INTERVAL_METERS,
        timeInterval: OFFER_TIME_INTERVAL_MS,
      },
      (fix) => {
        void ingestWalkOfferFixes([
          {
            latitude: fix.coords.latitude,
            longitude: fix.coords.longitude,
            recordedAt: fix.timestamp,
          },
        ]);
      },
    );
    foregroundWatch = watch;
    return true;
  } catch {
    return false;
  }
}

async function stopAllUpdates(): Promise<void> {
  stopForegroundWatch();
  const location = await loadLocationModule();
  if (location) {
    await stopBackgroundUpdates(location);
  }
}

setWalkOfferAfterPrompt(async () => {
  armedGoal = null;
  await stopAllUpdates();
});

/**
 * Starts (or refreshes) watching for an open walk goal. Foreground when-in-use
 * is enough for the in-app watch; Always is only required for pocket walks.
 */
export async function armWalkOfferMonitor(goal: OpenWalkOfferGoal): Promise<boolean> {
  const existing = await readWalkOfferRecord();
  if (walkOfferAlreadyHandled(existing, goal.dayKey, goal.userChallengeId)) {
    await disarmWalkOfferMonitor();
    return false;
  }

  if (
    armedGoal &&
    armedGoal.userChallengeId === goal.userChallengeId &&
    armedGoal.dayKey === goal.dayKey
  ) {
    await ensureWalkOfferSession(goal);
    armedGoal = goal;
    return true;
  }

  const location = await loadLocationModule();
  if (!location) {
    return false;
  }

  const foreground = await location.requestForegroundPermissionsAsync();
  if (foreground.status !== location.PermissionStatus.GRANTED) {
    return false;
  }

  // Drop any prior watch before starting a new occurrence.
  await stopAllUpdates();
  await ensureWalkOfferSession(goal);

  const backgroundStarted = await startBackgroundUpdates(location);
  const foregroundStarted = await startForegroundWatch(location);
  if (!backgroundStarted && !foregroundStarted) {
    await clearWalkOfferSession();
    armedGoal = null;
    return false;
  }

  armedGoal = goal;
  return true;
}

/** Stops watching and clears the in-progress session. Safe when nothing is armed. */
export async function disarmWalkOfferMonitor(): Promise<void> {
  armedGoal = null;
  await stopAllUpdates();
  await clearWalkOfferSession();
}

/**
 * After a cold start, keep counting a same-day session without waiting for
 * Today to mount. Stale sessions from yesterday are dropped.
 */
export async function resumeWalkOfferMonitorIfNeeded(): Promise<void> {
  const session = await readWalkOfferSession();
  if (!session) {
    return;
  }

  if (session.goal.dayKey !== localWalkOfferDayKey()) {
    await clearWalkOfferSession();
    return;
  }

  const existing = await readWalkOfferRecord();
  if (walkOfferAlreadyHandled(existing, session.goal.dayKey, session.goal.userChallengeId)) {
    await clearWalkOfferSession();
    return;
  }

  await armWalkOfferMonitor(session.goal);
}

export async function markWalkOfferAccepted(goal: OpenWalkOfferGoal): Promise<void> {
  await writeWalkOfferRecord({
    dayKey: goal.dayKey,
    userChallengeId: goal.userChallengeId,
    status: 'accepted',
  });
  await disarmWalkOfferMonitor();
}

export async function markWalkOfferDismissed(goal: OpenWalkOfferGoal): Promise<void> {
  await writeWalkOfferRecord({
    dayKey: goal.dayKey,
    userChallengeId: goal.userChallengeId,
    status: 'dismissed',
  });
  await disarmWalkOfferMonitor();
}
