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
 * Stays silent when the native module is missing, so a JS-only update on an
 * older binary cannot break the screen that buzzes.
 */
async function playHaptic(play: (haptics: HapticsModule) => Promise<void>): Promise<void> {
  if (!isHapticsNativeAvailable()) {
    return;
  }

  const haptics = loadHapticsModule();
  if (!haptics) {
    return;
  }

  try {
    await play(haptics);
  } catch {
    // A flourish must never fail the act it is celebrating. Silenced haptics,
    // Low Power Mode, and unsupported hardware all land here.
  }
}

/**
 * Success buzz for a goal landing mid-activity, when the user's eyes are on
 * the floor rather than the screen.
 */
export async function playGoalReachedHaptic(): Promise<void> {
  await playHaptic((haptics) =>
    haptics.notificationAsync(haptics.NotificationFeedbackType.Success),
  );
}

/** A light tap that confirms something small was sent, such as a cheer. */
export async function playSentHaptic(): Promise<void> {
  await playHaptic((haptics) => haptics.impactAsync(haptics.ImpactFeedbackStyle.Light));
}
