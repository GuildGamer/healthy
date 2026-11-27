import type { TodayChallenge } from '@product/client';
import { DECK_KIND_GLYPH, type DeckCardKind, deckCardKindFor } from '@/components/deck';
import type { GlyphName } from '@/components/icons';
import { useTheme } from '@/theme';
import { SHEET_GLYPH_BY_COMPLETION } from './constants/sheet-glyphs';

type ChallengeTone = {
  kind: DeckCardKind;
  /** The bright colour: a sheet's eyebrow, a slot's ring, a ring timer. */
  tone: string;
  /** The card's fill: a full-phone session's background. */
  fill: string;
  glyph: GlyphName;
};

/** The card's colour and mark, carried onto whatever surface the act moves to. */
export function useChallengeTone(
  challenge: Pick<TodayChallenge, 'category' | 'completionKind' | 'capture'>,
): ChallengeTone {
  const { deckCards } = useTheme();
  const kind = deckCardKindFor(challenge);

  return {
    kind,
    tone: deckCards.tones[kind],
    fill: deckCards[kind],
    glyph: SHEET_GLYPH_BY_COMPLETION[challenge.completionKind] ?? DECK_KIND_GLYPH[kind],
  };
}
