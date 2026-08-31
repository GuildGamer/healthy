import { nextRailOffset, railOverflow } from './tip-section-rail';

describe('tip section rail', () => {
  it('hides arrows when every mark already fits', () => {
    expect(railOverflow(0, 160, 320)).toEqual({
      canScrollBack: false,
      canScrollForward: false,
    });
  });

  it('shows a forward arrow at the start of an overflowing rail', () => {
    expect(railOverflow(0, 480, 240)).toEqual({
      canScrollBack: false,
      canScrollForward: true,
    });
  });

  it('shows both arrows in the middle, then only back at the end', () => {
    expect(railOverflow(80, 480, 240)).toEqual({
      canScrollBack: true,
      canScrollForward: true,
    });
    expect(railOverflow(240, 480, 240)).toEqual({
      canScrollBack: true,
      canScrollForward: false,
    });
  });

  it('pages the rail and clamps to the ends', () => {
    expect(nextRailOffset(0, 480, 240, 'forward', 100)).toBe(100);
    expect(nextRailOffset(200, 480, 240, 'forward', 100)).toBe(240);
    expect(nextRailOffset(40, 480, 240, 'back', 100)).toBe(0);
  });
});
