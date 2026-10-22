import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

export type NotificationPermission = 'granted' | 'denied' | 'undetermined';

export async function readNotificationPermission(): Promise<NotificationPermission> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return 'granted';
  }

  return current.canAskAgain ? 'undetermined' : 'denied';
}

/**
 * What the phone allows for Healthy. Read again whenever the app comes back,
 * because the usual fix is a trip to the phone's settings.
 */
export function useNotificationPermission(): NotificationPermission {
  const [permission, setPermission] = useState<NotificationPermission>('undetermined');

  const refresh = useCallback(() => {
    void readNotificationPermission()
      .then(setPermission)
      .catch(() => setPermission('undetermined'));
  }, []);

  useEffect(() => {
    refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refresh();
      }
    });

    return () => subscription.remove();
  }, [refresh]);

  return permission;
}
