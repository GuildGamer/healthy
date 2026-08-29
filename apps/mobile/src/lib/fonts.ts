import {
  ArchivoBlack_400Regular,
  useFonts,
} from '@expo-google-fonts/archivo-black';

/**
 * Reserved for hero numerals — the streak count. Deliberately not a brand
 * token: the identifier below is the name Expo registers at runtime, which is
 * not what a browser would ask for, so web would need its own mapping.
 */
export const displayFontFamily = 'ArchivoBlack_400Regular';

export function useDisplayFont(): boolean {
  const [areFontsLoaded, fontError] = useFonts({ ArchivoBlack_400Regular });

  // A missing font should degrade to the system face, never block the app.
  return areFontsLoaded || fontError !== null;
}
