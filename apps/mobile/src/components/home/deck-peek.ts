import { DECK_CARD_HEIGHT, DECK_PEEK_INSET, DECK_PEEK_OFFSET } from '@/components/deck';

export type DeckPeekGeometry = {
  /** Shrinks the card behind so it sits `DECK_PEEK_INSET` in on each side. */
  restingScale: number;
  /** Lifts it so only its top `DECK_PEEK_OFFSET` shows above the front card. */
  restingLift: number;
};

/**
 * Where the card behind rests. Scaling shrinks a card towards its centre, so
 * the lift has to make up for the top edge moving down.
 */
export function deckPeekGeometry(cardWidth: number): DeckPeekGeometry {
  if (cardWidth <= DECK_PEEK_INSET * 2) {
    return { restingScale: 1, restingLift: -DECK_PEEK_OFFSET };
  }

  const restingScale = (cardWidth - DECK_PEEK_INSET * 2) / cardWidth;
  const restingLift = -DECK_PEEK_OFFSET - (DECK_CARD_HEIGHT * (1 - restingScale)) / 2;
  return { restingScale, restingLift };
}
