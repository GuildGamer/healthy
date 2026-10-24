import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { hrefForPushData } from './open-push-destination';
import { trackEvent } from './track-event';

/**
 * Opens the screen named in a push when the person taps it, including a cold
 * start from a killed app. Records `push_opened` when the payload carries a
 * delivery id from the engagement module.
 */
export function usePushResponse(): void {
  const handledResponseId = useRef<string | null>(null);

  useEffect(() => {
    function openFromResponse(response: Notifications.NotificationResponse | null) {
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
      router.push(hrefForPushData(data));
    }

    void Notifications.getLastNotificationResponseAsync().then(openFromResponse);

    const subscription = Notifications.addNotificationResponseReceivedListener(openFromResponse);

    return () => {
      subscription.remove();
    };
  }, []);
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
