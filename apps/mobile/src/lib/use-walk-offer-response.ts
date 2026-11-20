import * as Notifications from 'expo-notifications';
import { type Href, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  markWalkOfferAccepted,
  markWalkOfferDismissed,
} from '@/lib/walk-offer-monitor';
import {
  ensureWalkOfferNotificationCategory,
  WALK_OFFER_NOT_NOW_ACTION,
  WALK_OFFER_YES_ACTION,
  walkOfferDataFromNotification,
  walkOfferSessionHref,
} from '@/lib/walk-offer-notifications';

/**
 * Handles Yes / Not now on the walk-offer local notification, including a cold
 * start. Yes opens the walk session with autoStart; Not now dismisses for today.
 */
export function useWalkOfferResponse(canNavigate: boolean): void {
  const handledResponseId = useRef<string | null>(null);
  const [pendingHref, setPendingHref] = useState<Href | null>(null);

  useEffect(() => {
    void ensureWalkOfferNotificationCategory();

    async function receiveResponse(response: Notifications.NotificationResponse | null) {
      if (!response) {
        return;
      }

      const responseId = response.notification.request.identifier;
      if (handledResponseId.current === responseId) {
        return;
      }

      const data = walkOfferDataFromNotification(response.notification.request.content.data);
      if (!data) {
        return;
      }

      handledResponseId.current = responseId;
      const action = response.actionIdentifier;
      const goal = {
        challengeId: data.challengeId,
        userChallengeId: data.userChallengeId,
        targetDurationMinutes: data.targetDurationMinutes,
        dayKey: data.dayKey,
      };

      if (action === WALK_OFFER_NOT_NOW_ACTION) {
        await markWalkOfferDismissed(goal);
        return;
      }

      // Default tap and Yes both start counting.
      if (
        action === WALK_OFFER_YES_ACTION ||
        action === Notifications.DEFAULT_ACTION_IDENTIFIER
      ) {
        await markWalkOfferAccepted(goal);
        setPendingHref(walkOfferSessionHref(data.challengeId) as Href);
      }
    }

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      void receiveResponse(response);
    });

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      void receiveResponse(response);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!canNavigate || !pendingHref) {
      return;
    }

    setPendingHref(null);
    router.navigate(pendingHref);
  }, [canNavigate, pendingHref]);
}
