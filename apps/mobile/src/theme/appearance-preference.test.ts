import * as SecureStore from 'expo-secure-store';
import {
  appearanceLabel,
  DEFAULT_APPEARANCE_PREFERENCE,
  loadAppearancePreference,
  resolveColorScheme,
  saveAppearancePreference,
} from './appearance-preference';

const getItemAsync = jest.mocked(SecureStore.getItemAsync);
const setItemAsync = jest.mocked(SecureStore.setItemAsync);

describe('resolveColorScheme', () => {
  it('keeps an explicit choice whatever the phone uses', () => {
    expect(resolveColorScheme('dark', 'light')).toBe('dark');
    expect(resolveColorScheme('light', 'dark')).toBe('light');
  });

  it('follows the phone on auto', () => {
    expect(resolveColorScheme('auto', 'light')).toBe('light');
    expect(resolveColorScheme('auto', 'dark')).toBe('dark');
  });

  it('falls back to dark when the phone reports nothing', () => {
    expect(resolveColorScheme('auto', null)).toBe('dark');
    expect(resolveColorScheme('auto', undefined)).toBe('dark');
  });
});

describe('loadAppearancePreference', () => {
  it('starts a new install on auto', async () => {
    getItemAsync.mockResolvedValueOnce(null);

    expect(DEFAULT_APPEARANCE_PREFERENCE).toBe('auto');
    await expect(loadAppearancePreference()).resolves.toBe('auto');
  });

  it('keeps a saved light, dark, or auto choice', async () => {
    getItemAsync.mockResolvedValueOnce('light');
    await expect(loadAppearancePreference()).resolves.toBe('light');

    getItemAsync.mockResolvedValueOnce('dark');
    await expect(loadAppearancePreference()).resolves.toBe('dark');

    getItemAsync.mockResolvedValueOnce('auto');
    await expect(loadAppearancePreference()).resolves.toBe('auto');
  });

  it('ignores an unrecognised stored value', async () => {
    getItemAsync.mockResolvedValueOnce('sepia');

    await expect(loadAppearancePreference()).resolves.toBe('auto');
  });

  it('falls back to auto when storage cannot be read', async () => {
    getItemAsync.mockRejectedValueOnce(new Error('keychain locked'));

    await expect(loadAppearancePreference()).resolves.toBe('auto');
  });
});

describe('saveAppearancePreference', () => {
  it('stores light, dark, and auto as themselves', async () => {
    await saveAppearancePreference('light');
    await saveAppearancePreference('dark');
    await saveAppearancePreference('auto');

    expect(setItemAsync).toHaveBeenNthCalledWith(1, 'appearance_preference', 'light');
    expect(setItemAsync).toHaveBeenNthCalledWith(2, 'appearance_preference', 'dark');
    expect(setItemAsync).toHaveBeenNthCalledWith(3, 'appearance_preference', 'auto');
  });
});

describe('appearanceLabel', () => {
  it('names each stored choice', () => {
    expect(appearanceLabel('light')).toBe('Light');
    expect(appearanceLabel('dark')).toBe('Dark');
    expect(appearanceLabel('auto')).toBe('Auto');
  });
});
