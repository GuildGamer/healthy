import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';

const REMINDERS_INTRO_ANSWERED_KEY = 'reminders_intro_answered';

/** Remembers Turn on or Not now, so the page before Today shows only once. */
export async function markRemindersIntroAnswered(): Promise<void> {
  await SecureStore.setItemAsync(REMINDERS_INTRO_ANSWERED_KEY, 'true');
}

/**
 * True once there is nothing left to ask: reminders are on, the phone has
 * already answered the permission prompt, or Not now was chosen here.
 */
export async function hasAnsweredRemindersIntro(reminderEnabled: boolean): Promise<boolean> {
  if (reminderEnabled) {
    return true;
  }

  const answered = await SecureStore.getItemAsync(REMINDERS_INTRO_ANSWERED_KEY);
  if (answered === 'true') {
    return true;
  }

  const permission = await Notifications.getPermissionsAsync();
  return permission.granted || !permission.canAskAgain;
}
