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
export const SPLASH_FAN_MS = 780;
/** How long the outer pair waits behind the inner pair, so they sweep past it. */
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

/** The icon at dead centre, where the native splash leaves it. */
export const SPLASH_ICON_SIZE = 104;
/** Cards in a deck share one size, so each card in the hand is the icon's size and shape. */
export const SPLASH_CARD_SIZE = SPLASH_ICON_SIZE;

/**
 * Where the hand grips the deck: every card turns about this one point, below
 * the icon's foot, so the cards spread sideways from a shared root as a fanned
 * hand does instead of lifting away from the icon.
 */
export const SPLASH_FAN_PIVOT: readonly [string, string, number] = ['50%', '160%', 0];

/** The whole hand rises this far as it opens, keeping the outer cards clear of the wordmark. */
const SPLASH_FAN_LIFT_Y = -14;

export interface SplashFanCard {
  kind: DeckCardKind;
  glyph: GlyphName;
  liftY: number;
  rotateDeg: number;
  /** Inner cards open first (0); the outer pair follows one stagger later (1). */
  dealStep: number;
}

/**
 * Back to front: two cards each side, outer pair behind the inner pair. An even
 * hand, because the icon already holds the centre and a middle card would sit
 * hidden behind it.
 */
export const SPLASH_FAN: readonly SplashFanCard[] = [
  { kind: 'walk', glyph: 'walk', liftY: SPLASH_FAN_LIFT_Y, rotateDeg: -26, dealStep: 1 },
  { kind: 'gym', glyph: 'gym', liftY: SPLASH_FAN_LIFT_Y, rotateDeg: 26, dealStep: 1 },
  { kind: 'strength', glyph: 'strength', liftY: SPLASH_FAN_LIFT_Y, rotateDeg: -13, dealStep: 0 },
  { kind: 'water', glyph: 'water', liftY: SPLASH_FAN_LIFT_Y, rotateDeg: 13, dealStep: 0 },
];
