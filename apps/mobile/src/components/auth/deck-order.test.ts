import { deckSlot, nextTopIndex } from './deck-order';

describe('deck order', () => {
  it('puts the top card first and the rest behind in order', () => {
    expect([0, 1, 2].map((card) => deckSlot(card, 0, 3))).toEqual([0, 1, 2]);
    expect([0, 1, 2].map((card) => deckSlot(card, 1, 3))).toEqual([2, 0, 1]);
  });

  it('deals round to the first card again', () => {
    expect(nextTopIndex(0, 3)).toBe(1);
    expect(nextTopIndex(2, 3)).toBe(0);
  });
});
