export const RAIL_SCROLL_STEP = 120;

export function railOverflow(
  offset: number,
  contentWidth: number,
  viewportWidth: number,
): { canScrollBack: boolean; canScrollForward: boolean } {
  const slack = 2;

  if (contentWidth <= viewportWidth + slack) {
    return { canScrollBack: false, canScrollForward: false };
  }

  const maxOffset = contentWidth - viewportWidth;

  return {
    canScrollBack: offset > slack,
    canScrollForward: offset < maxOffset - slack,
  };
}

export function nextRailOffset(
  offset: number,
  contentWidth: number,
  viewportWidth: number,
  direction: 'back' | 'forward',
  step: number = RAIL_SCROLL_STEP,
): number {
  const maxOffset = Math.max(0, contentWidth - viewportWidth);

  if (direction === 'back') {
    return Math.max(0, offset - step);
  }

  return Math.min(maxOffset, offset + step);
}
