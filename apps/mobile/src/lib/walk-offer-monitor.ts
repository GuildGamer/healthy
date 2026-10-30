import { accumulateWalkOfferFix, emptyWalkOfferBout, type WalkOfferBout } from '@/lib/walk-offer-bout';
import { WALK_OFFER_FOREGROUND_SERVICE } from '@/lib/walk-offer-copy';
import type { OpenWalkOfferGoal } from '@/lib/walk-offer-goal';
import {
  setWalkOfferLocationListener,
  WALK_OFFER_LOCATION_TASK,
} from '@/lib/walk-offer-location';
import { scheduleWalkOfferNotification } from '@/lib/walk-offer-notifications';
import {
  readWalkOfferRecord,
  walkOfferAlreadyHandled,
  writeWalkOfferRecord,
} from '@/lib/walk-offer-state';
import { walkOfferShouldPrompt } from '@/lib/walk-offer-threshold';
import { loadLocationModule, type LocationModule } from '@/lib/device-health';
import type { GeoPoint } from '@/lib/geo-session';

const OFFER_DISTANCE_INTERVAL_METERS = 15;
const OFFER_TIME_INTERVAL_MS = 15_000;

type ArmedOffer = {
  goal: OpenWalkOfferGoal;
  bout: WalkOfferBout;
};

let armed: ArmedOffer | null = null;
let prompting = false;

export function isWalkOfferArmed(): boolean {
  return armed !== null;
}

export function getArmedWalkOfferGoal(): OpenWalkOfferGoal | null {
  return armed?.goal ?? null;
}

async function stopOfferUpdates(location: LocationModule): Promise<void> {
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

async function startOfferUpdates(location: LocationModule): Promise<boolean> {
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
      pausesUpdatesAutomatically: true,
      activityType: location.ActivityType?.Fitness,
      foregroundService: { ...WALK_OFFER_FOREGROUND_SERVICE },
    });
    return true;
  } catch {
    return false;
  }
}

async function onFixes(fixes: readonly GeoPoint[]): Promise<void> {
  if (!armed || prompting || fixes.length === 0) {
    return;
  }

  let bout = armed.bout;
  for (const fix of fixes) {
    bout = accumulateWalkOfferFix(bout, fix);
  }
  armed = { ...armed, bout };

  if (!walkOfferShouldPrompt(bout.movingSeconds, armed.goal.targetDurationMinutes)) {
    return;
  }

  prompting = true;
  const goal = armed.goal;
  try {
    await writeWalkOfferRecord({
      dayKey: goal.dayKey,
      userChallengeId: goal.userChallengeId,
      status: 'offered',
    });
    await scheduleWalkOfferNotification(goal);
    await disarmWalkOfferMonitor();
  } catch {
    // Leave armed so a later fix can retry the prompt.
    prompting = false;
  }
}

/**
 * Starts (or refreshes) background watching for an open walk goal. No-op when
 * that occurrence already got a prompt today, or location cannot run.
 */
export async function armWalkOfferMonitor(goal: OpenWalkOfferGoal): Promise<boolean> {
  const existing = await readWalkOfferRecord();
  if (walkOfferAlreadyHandled(existing, goal.dayKey, goal.userChallengeId)) {
    await disarmWalkOfferMonitor();
    return false;
  }

  if (
    armed &&
    armed.goal.userChallengeId === goal.userChallengeId &&
    armed.goal.dayKey === goal.dayKey
  ) {
    armed = { ...armed, goal };
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

  await disarmWalkOfferMonitor();
  setWalkOfferLocationListener((fixes) => {
    void onFixes(fixes);
  });

  const started = await startOfferUpdates(location);
  if (!started) {
    setWalkOfferLocationListener(null);
    return false;
  }

  armed = { goal, bout: emptyWalkOfferBout() };
  prompting = false;
  return true;
}

/** Stops background watching. Safe when nothing is armed. */
export async function disarmWalkOfferMonitor(): Promise<void> {
  setWalkOfferLocationListener(null);
  armed = null;
  prompting = false;
  const location = await loadLocationModule();
  if (location) {
    await stopOfferUpdates(location);
  }
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
