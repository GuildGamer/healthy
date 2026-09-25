import * as Haptics from 'expo-haptics';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { isHapticsNativeAvailable, playGoalReachedHaptic } from './haptics';

jest.mock('expo-modules-core', () => {
  const actual = jest.requireActual('expo-modules-core') as object;
  return {
    ...actual,
    requireOptionalNativeModule: jest.fn(),
  };
});

const mockedRequire = requireOptionalNativeModule as jest.MockedFunction<
  typeof requireOptionalNativeModule
>;

describe('haptics', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('treats a missing native module as unavailable', () => {
    mockedRequire.mockReturnValue(null);
    expect(isHapticsNativeAvailable()).toBe(false);
  });

  it('stays silent when the native module is missing', async () => {
    mockedRequire.mockReturnValue(null);

    await playGoalReachedHaptic();

    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  });

  it('plays a success buzz when the native module is installed', async () => {
    mockedRequire.mockReturnValue({});

    await playGoalReachedHaptic();

    expect(Haptics.notificationAsync).toHaveBeenCalledWith(
      Haptics.NotificationFeedbackType.Success,
    );
  });

  it('swallows a haptics failure so the rep still counts', async () => {
    mockedRequire.mockReturnValue({});
    (Haptics.notificationAsync as jest.Mock).mockRejectedValueOnce(
      new Error('Vibrator unavailable'),
    );

    await expect(playGoalReachedHaptic()).resolves.toBeUndefined();
  });
});
