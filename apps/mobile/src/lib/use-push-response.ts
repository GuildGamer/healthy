import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { type Href, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { hrefForPushData } from './open-push-destination';
import { trackEvent } from './track-event';

/**
 * Opens the screen named in a push when the person taps it, including a cold
 * start from a killed app. Records `push_opened` when the payload carries a
 * delivery id from the engagement module.
 *
 * A cold-start tap arrives before the navigator is mounted, and navigating
 * then throws. The destination is held until `canNavigate` — launch has left
 * the root `index` route — so it also lands after launch's own redirect
 * rather than being replaced by it.
 */
export function usePushResponse(canNavigate: boolean): void {
  const handledResponseId = useRef<string | null>(null);
  const [pendingHref, setPendingHref] = useState<Href | null>(null);

  useEffect(() => {
    function receiveResponse(response: Notifications.NotificationResponse | null) {
      if (!response) {
        return;
      }

      const responseId = response.notification.request.identifier;
      if (handledResponseId.current === responseId) {
        return;
      }

      handledResponseId.current = responseId;
      const data = response.notification.request.content.data;
      trackPushOpened(data);
      setPendingHref(hrefForPushData(data));
    }

    void Notifications.getLastNotificationResponseAsync().then(receiveResponse);

    const subscription = Notifications.addNotificationResponseReceivedListener(receiveResponse);

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

function trackPushOpened(data: unknown): void {
  if (!data || typeof data !== 'object') {
    return;
  }

  const deliveryId = (data as Record<string, unknown>).engagementDeliveryId;
  if (typeof deliveryId !== 'string' || deliveryId.length === 0) {
    return;
  }

  trackEvent('push_opened', {
    engagementDeliveryId: deliveryId,
    appVersion: Constants.expoConfig?.version ?? 'unknown',
  });
}
