import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { hrefForPushData } from './open-push-destination';

/**
 * Opens the screen named in a push when the person taps it, including a cold
 * start from a killed app.
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
      router.push(hrefForPushData(response.notification.request.content.data));
    }

    void Notifications.getLastNotificationResponseAsync().then(openFromResponse);

    const subscription = Notifications.addNotificationResponseReceivedListener(openFromResponse);

    return () => {
      subscription.remove();
    };
  }, []);
}
