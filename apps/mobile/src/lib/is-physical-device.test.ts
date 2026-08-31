import { isPhysicalDevice } from './is-physical-device';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { isDevice: true },
}));

describe('isPhysicalDevice', () => {
  it('is true when Expo reports a real device', () => {
    expect(isPhysicalDevice()).toBe(true);
  });
});
