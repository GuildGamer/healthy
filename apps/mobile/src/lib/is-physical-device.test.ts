import { isPhysicalDevice } from './is-physical-device';

const constantsMock = jest.requireMock('expo-constants') as {
  default: { isDevice?: boolean | null };
};

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { isDevice: true },
}));

describe('isPhysicalDevice', () => {
  it('is true when Expo reports a real device', () => {
    constantsMock.default.isDevice = true;
    expect(isPhysicalDevice()).toBe(true);
  });

  it('is false only when Expo explicitly reports a simulator', () => {
    constantsMock.default.isDevice = false;
    expect(isPhysicalDevice()).toBe(false);
  });

  it('defaults to true when the legacy flag is gone (current Expo SDKs)', () => {
    delete constantsMock.default.isDevice;
    expect(isPhysicalDevice()).toBe(true);
  });
});
