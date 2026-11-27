import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { trackEvent } from '@/lib/analytics';

const ANDROID_CHANNEL_ID = 'daily-reminder';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestReminderPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    return true;
  }

  if (!current.canAskAgain) {
    trackEvent('permission_result', {
      permission: 'notifications',
      granted: false,
      canAskAgain: false,
    });
    return false;
  }

  const requested = await Notifications.requestPermissionsAsync();
  trackEvent('permission_result', {
    permission: 'notifications',
    granted: requested.granted,
    canAskAgain: requested.canAskAgain,
  });
  return requested.granted;
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Daily reminder',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/**
 * Server-side push needs an Expo token per install. Returns null when the
 * user refused permission or this build has no EAS project id.
 */
export async function getExpoPushToken(): Promise<string | null> {
  const granted = await requestReminderPermission();
  if (!granted) {
    return null;
  }

  await ensureAndroidChannel();
  // Leftover local schedules from the previous delivery path.
  await Notifications.cancelAllScheduledNotificationsAsync();

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (typeof projectId !== 'string' || projectId.length === 0) {
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}

/** @deprecated Always 12-hour; use `formatClockTime` from `@/lib/clock-time`, which follows the phone. */
export function formatReminderMinute(reminderMinute: number): string {
  const hour = Math.floor(reminderMinute / 60);
  const minute = reminderMinute % 60;
  const suffix = hour < 12 ? 'am' : 'pm';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${String(minute).padStart(2, '0')} ${suffix}`;
}
