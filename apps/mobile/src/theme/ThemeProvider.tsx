import {
  type BrandColors,
  type CameraChromeColors,
  type ColorScheme,
  type ConditionTones,
  type DeckCardColors,
  cameraChromePalettes,
  conditionTonePalettes,
  deckCardPalettes,
  palettes,
} from '@product/brand';
import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'expo-status-bar';
import { type ReactNode, createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import {
  type AppearancePreference,
  DEFAULT_APPEARANCE_PREFERENCE,
  loadAppearancePreference,
  resolveColorScheme,
  saveAppearancePreference,
} from './appearance-preference';

export interface Theme {
  scheme: ColorScheme;
  colors: BrandColors;
  conditionTones: ConditionTones;
  deckCards: DeckCardColors;
  camera: CameraChromeColors;
}

interface ThemeContextValue {
  theme: Theme;
  preference: AppearancePreference;
  setPreference: (preference: AppearancePreference) => void;
}

export function themeFor(scheme: ColorScheme): Theme {
  return {
    scheme,
    colors: palettes[scheme],
    conditionTones: conditionTonePalettes[scheme],
    deckCards: deckCardPalettes[scheme],
    camera: cameraChromePalettes[scheme],
  };
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: themeFor(resolveColorScheme(DEFAULT_APPEARANCE_PREFERENCE, null)),
  preference: DEFAULT_APPEARANCE_PREFERENCE,
  setPreference: () => undefined,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<AppearancePreference>(
    DEFAULT_APPEARANCE_PREFERENCE,
  );

  useEffect(() => {
    let cancelled = false;
    void loadAppearancePreference().then((stored) => {
      if (!cancelled) {
        setPreferenceState(stored);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const scheme = resolveColorScheme(preference, systemScheme);

  useEffect(() => {
    // `null` clears an override so Auto follows the phone, including the
    // status bar and Android navigation-bar icons.
    Appearance.setColorScheme(preference === 'auto' ? null : preference);
    return () => {
      Appearance.setColorScheme(null);
    };
  }, [preference]);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(palettes[scheme].background).catch(() => undefined);
  }, [scheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: themeFor(scheme),
      preference,
      setPreference: (next) => {
        setPreferenceState(next);
        void saveAppearancePreference(next);
      },
    }),
    [scheme, preference],
  );

  return (
    <ThemeContext.Provider value={value}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext).theme;
}

export function useAppearancePreference(): Pick<ThemeContextValue, 'preference' | 'setPreference'> {
  const { preference, setPreference } = useContext(ThemeContext);
  return { preference, setPreference };
}
