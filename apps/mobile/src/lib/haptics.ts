import { requireOptionalNativeModule } from 'expo-modules-core';

type HapticsModule = typeof import('expo-haptics');

export function isHapticsNativeAvailable(): boolean {
  return requireOptionalNativeModule('ExpoHaptics') != null;
}

function loadHapticsModule(): HapticsModule | null {
  try {
    // Deferred require keeps this file import-safe when ExpoHaptics is absent.
    // Prefer require so Jest mocks apply (dynamic import does not).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-haptics') as HapticsModule;
  } catch {
    return null;
  }
}

/**
 * Success buzz for a goal landing mid-activity, when the user's eyes are on
 * the floor rather than the screen. Stays silent when the native module is
 * missing, so a JS-only update on an older binary cannot break the session.
 */
export async function playGoalReachedHaptic(): Promise<void> {
  if (!isHapticsNativeAvailable()) {
    return;
  }

  const haptics = loadHapticsModule();
  if (!haptics) {
    return;
  }

  try {
    await haptics.notificationAsync(haptics.NotificationFeedbackType.Success);
  } catch {
    // A flourish must never fail the rep it is celebrating. Silenced haptics,
    // Low Power Mode, and unsupported hardware all land here.
  }
}
