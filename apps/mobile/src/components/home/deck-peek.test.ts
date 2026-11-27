import { DECK_CARD_HEIGHT, DECK_PEEK_INSET, DECK_PEEK_OFFSET } from '@/components/deck';
import { deckPeekGeometry } from './deck-peek';

/** The card behind's top edge and side, measured from the front card's. */
function restingEdges(cardWidth: number) {
  const { restingScale, restingLift } = deckPeekGeometry(cardWidth);
  const scaledHeight = DECK_CARD_HEIGHT * restingScale;
  const scaledWidth = cardWidth * restingScale;
  return {
    top: (DECK_CARD_HEIGHT - scaledHeight) / 2 + restingLift,
    side: (cardWidth - scaledWidth) / 2,
  };
}

describe('deckPeekGeometry', () => {
  it.each([280, 335, 350, 390])(
    'peeks a thin edge above a %ppt card, tucked in on both sides',
    (width) => {
      const edges = restingEdges(width);

      expect(edges.top).toBeCloseTo(-DECK_PEEK_OFFSET);
      expect(edges.side).toBeCloseTo(DECK_PEEK_INSET);
    },
  );

  it('never mirrors or collapses the card before the deck has been measured', () => {
    expect(deckPeekGeometry(0)).toEqual({ restingScale: 1, restingLift: -DECK_PEEK_OFFSET });
  });
});
