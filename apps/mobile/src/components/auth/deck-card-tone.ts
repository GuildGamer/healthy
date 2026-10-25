import type { DeckCardKind } from '@/components/deck';
import type { Theme } from '@/theme';

/** The bright tone a card's rail takes where Clinic fills are all white. */
export function deckCardTone(theme: Theme, kind: DeckCardKind): string {
  return theme.deckCards.tones[kind];
}
