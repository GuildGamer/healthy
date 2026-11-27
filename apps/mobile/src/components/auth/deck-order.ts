/** Where a card sits in the stack: 0 on top, then each one further behind. */
export function deckSlot(cardIndex: number, topIndex: number, cardCount: number): number {
  return (cardIndex - topIndex + cardCount) % cardCount;
}

export function nextTopIndex(topIndex: number, cardCount: number): number {
  return (topIndex + 1) % cardCount;
}
