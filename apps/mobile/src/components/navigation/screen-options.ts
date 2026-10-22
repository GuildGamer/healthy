/**
 * A sheet route: Today stays drawn behind it, so the screen itself is
 * transparent and the sheet brings its own scrim and slide.
 */
export const DECK_SHEET_SCREEN_OPTIONS = {
  headerShown: false,
  presentation: 'transparentModal',
  animation: 'fade',
  contentStyle: { backgroundColor: 'transparent' },
} as const;

/** A full-phone session: the act takes the whole screen and draws its own way out. */
export const FULL_PHONE_SCREEN_OPTIONS = {
  headerShown: false,
  gestureEnabled: false,
} as const;
