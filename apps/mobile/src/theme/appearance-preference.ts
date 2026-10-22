import type { ColorScheme } from '@product/brand';
import * as SecureStore from 'expo-secure-store';

export type AppearancePreference = 'dark' | 'light' | 'auto';

const STORAGE_KEY = 'appearance_preference';

/**
 * Nothing stored means Auto: follow the phone. Picking Auto writes the same
 * value, so it is a real choice and not an empty key.
 */
export const DEFAULT_APPEARANCE_PREFERENCE: AppearancePreference = 'auto';

/** Colour used only when Auto is on and the phone reports no scheme at all. */
const FALLBACK_COLOR_SCHEME: ColorScheme = 'dark';

const APPEARANCE_LABELS: Record<AppearancePreference, string> = {
  dark: 'Dark',
  light: 'Light',
  auto: 'Auto',
};

export function appearanceLabel(preference: AppearancePreference): string {
  return APPEARANCE_LABELS[preference];
}

function isAppearancePreference(value: string): value is AppearancePreference {
  return value === 'dark' || value === 'light' || value === 'auto';
}

export async function loadAppearancePreference(): Promise<AppearancePreference> {
  try {
    const stored = await SecureStore.getItemAsync(STORAGE_KEY);
    if (stored && isAppearancePreference(stored)) {
      return stored;
    }
  } catch {
    // Unreadable storage falls back to the default rather than blocking launch.
  }

  return DEFAULT_APPEARANCE_PREFERENCE;
}

export async function saveAppearancePreference(preference: AppearancePreference): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEY, preference);
}

export function resolveColorScheme(
  preference: AppearancePreference,
  systemScheme: string | null | undefined,
): ColorScheme {
  if (preference !== 'auto') {
    return preference;
  }

  if (systemScheme === 'dark' || systemScheme === 'light') {
    return systemScheme;
  }

  return FALLBACK_COLOR_SCHEME;
}
