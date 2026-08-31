import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { apiClient } from './api';
import { useSession } from './auth-client';
import { getExpoPushToken } from './notifications';

/**
 * Registers this install for server-side reminders when the Profile master
 * switch is on. Unregisters when they turn it off or sign out, so the next
 * account does not inherit the previous person's nudges.
 */
export function usePushDeviceSync(reminderEnabled: boolean): void {
  const { data: session } = useSession();
  const isSignedIn = Boolean(session);

  const tokenQuery = useQuery({
    queryKey: ['push-token'],
    queryFn: getExpoPushToken,
    enabled: isSignedIn && reminderEnabled,
    staleTime: Infinity,
    retry: false,
  });

  const expoPushToken = tokenQuery.data ?? null;

  useEffect(() => {
    if (!expoPushToken) {
      return;
    }

    if (isSignedIn && reminderEnabled) {
      void apiClient.registerPushDevice({
        expoPushToken,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
      });
      return;
    }

    void apiClient.unregisterPushDevice({ expoPushToken });
  }, [expoPushToken, isSignedIn, reminderEnabled]);
}
