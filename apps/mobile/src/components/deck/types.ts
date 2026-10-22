import type { DeckCardTones } from '@product/brand';
import type { GlyphName } from '@/components/icons';

/** Which fill a card takes. Every kind has a tone in `theme.deckCards.tones`. */
export type DeckCardKind = keyof DeckCardTones;

export type DeckButtonVariant =
  /** The one obvious tap. */
  | 'primary'
  /** An offer that sits beside the obvious tap, tinted by the card. */
  | 'tonal'
  /** A way out, with no fill at all. */
  | 'quiet'
  /** The main button over a live camera. */
  | 'cameraSolid'
  /** A quiet button over a live camera. */
  | 'cameraGlass';

export type KeypadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.' | 'delete';

/** The big line on a card's done side: a numeral, or a word such as "Done." */
export type DoneFaceHeadline =
  { kind: 'measure'; value: string; of: string } | { kind: 'word'; word: string; sub: string };

export type DoneFaceProof = {
  glyph: GlyphName;
  line: string;
};

export type DoneFaceQuietAction = {
  label: string;
  onPress: () => void;
  isBusy: boolean;
  testID: string;
};
