import {
  ArchivoBlack_400Regular,
  useFonts,
} from '@expo-google-fonts/archivo-black';
import { Platform } from 'react-native';

/**
 * Display face for hero moments: splash wordmark, onboarding / auth titles,
 * streak and points numerals, celebration headlines. Deliberately not a brand
 * token: the identifier below is the name Expo registers at runtime, which is
 * not what a browser would ask for, so web would need its own mapping.
 *
 * Do not pair with fontWeight — the face is already black, and asking for a
 * weight it has no file for makes Android synthesise a smeared bold.
 */
export const displayFontFamily = 'ArchivoBlack_400Regular';

/**
 * Brand display stack is Fraunces → Georgia → serif. RN cannot load a CSS font
 * list, so the tip quote uses the system serif that already sits in that stack.
 */
export const tipQuoteFontFamily = Platform.select({
  ios: 'Georgia',
  android: 'serif',
  default: 'Georgia',
});

export function useDisplayFont(): boolean {
  const [areFontsLoaded, fontError] = useFonts({ ArchivoBlack_400Regular });

  // A missing font should degrade to the system face, never block the app.
  return areFontsLoaded || fontError !== null;
}
