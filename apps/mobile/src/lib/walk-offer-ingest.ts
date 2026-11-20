import {
  accumulateWalkOfferFix,
  preferFurtherWalkOfferBout,
  type WalkOfferBout,
} from '@/lib/walk-offer-bout';
import type { OpenWalkOfferGoal } from '@/lib/walk-offer-goal';
import {
  ensureWalkOfferNotificationCategory,
  scheduleWalkOfferNotification,
} from '@/lib/walk-offer-notifications';
import {
  clearWalkOfferSession,
  readWalkOfferSession,
  writeWalkOfferSession,
} from '@/lib/walk-offer-session';
import {
  readWalkOfferRecord,
  walkOfferAlreadyHandled,
  writeWalkOfferRecord,
} from '@/lib/walk-offer-state';
import { walkOfferShouldPrompt } from '@/lib/walk-offer-threshold';
import type { GeoPoint } from '@/lib/geo-session';

let prompting = false;

/** Called after a successful prompt so the monitor can drop location updates. */
type AfterPrompt = () => Promise<void>;

let afterPrompt: AfterPrompt | null = null;

export function setWalkOfferAfterPrompt(next: AfterPrompt | null): void {
  afterPrompt = next;
}

export function isWalkOfferPrompting(): boolean {
  return prompting;
}

/**
 * Fold location fixes into the persisted bout and, when the threshold is met,
 * schedule the Yes / Not now notification. Safe from the background task and
 * from a foreground watch — concurrent writers keep the further bout.
 */
export async function ingestWalkOfferFixes(fixes: readonly GeoPoint[]): Promise<void> {
  if (fixes.length === 0 || prompting) {
    return;
  }

  const before = await readWalkOfferSession();
  if (!before) {
    return;
  }

  let bout: WalkOfferBout = before.bout;
  for (const fix of fixes) {
    bout = accumulateWalkOfferFix(bout, fix);
  }

  const latest = await readWalkOfferSession();
  if (!latest) {
    return;
  }

  if (
    latest.goal.userChallengeId !== before.goal.userChallengeId ||
    latest.goal.dayKey !== before.goal.dayKey
  ) {
    return;
  }

  const merged = preferFurtherWalkOfferBout(latest.bout, bout);
  await writeWalkOfferSession({ goal: latest.goal, bout: merged });

  if (!walkOfferShouldPrompt(merged.movingSeconds, latest.goal.targetDurationMinutes)) {
    return;
  }

  await promptWalkOffer(latest.goal);
}

async function promptWalkOffer(goal: OpenWalkOfferGoal): Promise<void> {
  if (prompting) {
    return;
  }

  const existing = await readWalkOfferRecord();
  if (walkOfferAlreadyHandled(existing, goal.dayKey, goal.userChallengeId)) {
    await clearWalkOfferSession();
    if (afterPrompt) {
      await afterPrompt();
    }
    return;
  }

  prompting = true;
  try {
    // Category must exist on a headless wake — the UI effect may not have run.
    await ensureWalkOfferNotificationCategory();
    await scheduleWalkOfferNotification(goal);
    await writeWalkOfferRecord({
      dayKey: goal.dayKey,
      userChallengeId: goal.userChallengeId,
      status: 'offered',
    });
    await clearWalkOfferSession();
    if (afterPrompt) {
      await afterPrompt();
    }
  } catch {
    // Leave the session armed so a later fix can retry the prompt.
  } finally {
    prompting = false;
  }
}
