import type { GlyphName } from '@/components/icons';
import type { DeckCardKind } from './welcome-deck';

/**
 * Cross-fade out of the native splash, covering the handoff frame. iOS only —
 * Android cuts, which is unnoticeable because the icon does not move across it.
 */
export const NATIVE_SPLASH_FADE_MS = 220;

/**
 * The splash fails open: this long after the native splash hides it leaves
 * whether or not launch has settled, so a hung request shows the screen's own
 * loading or offline state instead of a splash that never ends.
 */
export const SPLASH_MAX_HOLD_MS = 4000;

/** From the first card leaving the icon to the last one settling. */
export const SPLASH_FAN_MS = 960;
export const SPLASH_FAN_STAGGER_MS = 80;
/**
 * Once the app is ready, cards still moving land within this, even if they
 * had only just left the icon. Shorter than the exit fade, so they are seen
 * landing.
 */
export const SPLASH_CATCH_UP_MS = 200;
export const SPLASH_EXIT_FADE_MS = 220;
/** With Reduce Motion the cards appear already fanned, fading in over this. */
export const SPLASH_REDUCED_FADE_IN_MS = 200;
export const SPLASH_SWAY_DEG = 3;
/** Each way; a full sway there and back takes twice this. */
export const SPLASH_SWAY_HALF_PERIOD_MS = 2250;

export const SPLASH_CARD_WIDTH = 92;
export const SPLASH_CARD_HEIGHT = 62;

export interface SplashFanCard {
  kind: DeckCardKind;
  glyph: GlyphName;
  translateX: number;
  translateY: number;
  rotateDeg: number;
}

/** Back to front, like a hand of cards; the icon stays in front of all three. */
export const SPLASH_FAN: readonly SplashFanCard[] = [
  {
    kind: 'strength',
    glyph: 'everydayHealth',
    translateX: -34,
    translateY: -46,
    rotateDeg: -12,
  },
  { kind: 'strength', glyph: 'check', translateX: 0, translateY: -58, rotateDeg: 0 },
  { kind: 'strength', glyph: 'everydayHealth', translateX: 34, translateY: -46, rotateDeg: 12 },
];
