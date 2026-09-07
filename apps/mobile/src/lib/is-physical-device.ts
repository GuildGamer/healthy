import Constants from 'expo-constants';

type ConstantsWithLegacyDeviceFlag = typeof Constants & {
  /** Removed in recent Expo SDKs; may still exist on older binaries. */
  isDevice?: boolean | null;
};

/**
 * Whether the app is running on a physical phone (not a simulator/emulator).
 *
 * Expo removed `Constants.isDevice`. Treating a missing flag as “simulator”
 * blocked the gym camera on real devices — only trust an explicit `false`.
 */
export function isPhysicalDevice(): boolean {
  const flag = (Constants as ConstantsWithLegacyDeviceFlag).isDevice;
  if (flag === false) {
    return false;
  }

  return true;
}
