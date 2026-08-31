import Constants from 'expo-constants';

export function isPhysicalDevice(): boolean {
  return Constants.isDevice === true;
}
