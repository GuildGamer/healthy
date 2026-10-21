import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { apiClient } from './api';
import { useSession } from './auth-client';
import { requestReminderPermission } from './notifications';

/**
 * Asks for notification permission the first time a signed-in person lands on
 * the tabs. Granting it turns Daily reminders on and registers the phone.
 * iOS remembers a denial, so this does not ask again every launch.
 */
export function useRequestReminderOnLaunch(enabled: boolean): void {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const askedThisLaunch = useRef(false);

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.me(),
    enabled: enabled && Boolean(session),
  });

  const enableReminders = useMutation({
    mutationFn: async (reminderMinute: number) => {
      await apiClient.updateReminder({
        enabled: true,
        reminderMinute,
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });

  useEffect(() => {
    if (!enabled || !session || !meQuery.data || askedThisLaunch.current) {
      return;
    }

    if (meQuery.data.reminderEnabled) {
      return;
    }

    let cancelled = false;
    askedThisLaunch.current = true;

    void (async () => {
      const current = await Notifications.getPermissionsAsync();
      if (cancelled) {
        return;
      }

      if (current.granted || !current.canAskAgain) {
        return;
      }

      const granted = await requestReminderPermission();
      if (cancelled || !granted) {
        return;
      }

      enableReminders.mutate(meQuery.data.reminderMinute);
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, enableReminders, meQuery.data, session]);
}
