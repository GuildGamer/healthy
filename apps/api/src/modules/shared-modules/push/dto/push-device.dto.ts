export type DevicePlatform = 'ios' | 'android';

export type PushDeviceDto = {
  expoPushToken: string;
  platform: DevicePlatform;
  isActive: boolean;
};
