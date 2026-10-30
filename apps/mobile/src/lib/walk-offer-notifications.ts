import * as Notifications from 'expo-notifications';
import {
  WALK_OFFER_NOT_NOW_LABEL,
  WALK_OFFER_YES_LABEL,
  walkOfferNotificationCopy,
} from '@/lib/walk-offer-copy';
import type { OpenWalkOfferGoal } from '@/lib/walk-offer-goal';

export const WALK_OFFER_CATEGORY = 'walk_offer';
export const WALK_OFFER_YES_ACTION = 'WALK_OFFER_YES';
export const WALK_OFFER_NOT_NOW_ACTION = 'WALK_OFFER_NOT_NOW';

export type WalkOfferNotificationData = {
  kind: 'walk_offer';
  challengeId: string;
  userChallengeId: string;
  dayKey: string;
  targetDurationMinutes: number;
};

let categoryReady = false;

/** Registers Yes / Not now once per process. */
export async function ensureWalkOfferNotificationCategory(): Promise<void> {
  if (categoryReady) {
    return;
  }

  await Notifications.setNotificationCategoryAsync(WALK_OFFER_CATEGORY, [
    {
      identifier: WALK_OFFER_YES_ACTION,
      buttonTitle: WALK_OFFER_YES_LABEL,
      options: { opensAppToForeground: true },
    },
    {
      identifier: WALK_OFFER_NOT_NOW_ACTION,
      buttonTitle: WALK_OFFER_NOT_NOW_LABEL,
      options: { opensAppToForeground: false },
    },
  ]);
  categoryReady = true;
}

export async function scheduleWalkOfferNotification(goal: OpenWalkOfferGoal): Promise<void> {
  await ensureWalkOfferNotificationCategory();
  const copy = walkOfferNotificationCopy(goal.targetDurationMinutes);
  const data: WalkOfferNotificationData = {
    kind: 'walk_offer',
    challengeId: goal.challengeId,
    userChallengeId: goal.userChallengeId,
    dayKey: goal.dayKey,
    targetDurationMinutes: goal.targetDurationMinutes,
  };

  await Notifications.scheduleNotificationAsync({
    content: {
      title: copy.title,
      body: copy.body,
      categoryIdentifier: WALK_OFFER_CATEGORY,
      data,
      sound: true,
    },
    trigger: null,
  });
}

export function walkOfferDataFromNotification(data: unknown): WalkOfferNotificationData | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const payload = data as Record<string, unknown>;
  if (payload.kind !== 'walk_offer') {
    return null;
  }

  const challengeId = typeof payload.challengeId === 'string' ? payload.challengeId.trim() : '';
  const userChallengeId =
    typeof payload.userChallengeId === 'string' ? payload.userChallengeId.trim() : '';
  const dayKey = typeof payload.dayKey === 'string' ? payload.dayKey.trim() : '';
  const targetDurationMinutes =
    typeof payload.targetDurationMinutes === 'number' ? payload.targetDurationMinutes : 0;

  if (!challengeId || !userChallengeId || !dayKey || targetDurationMinutes <= 0) {
    return null;
  }

  return { kind: 'walk_offer', challengeId, userChallengeId, dayKey, targetDurationMinutes };
}

/** Session route that auto-starts the GPS walk after Yes. */
export function walkOfferSessionHref(challengeId: string): string {
  return `/challenge/${challengeId}/session?autoStart=1`;
}
