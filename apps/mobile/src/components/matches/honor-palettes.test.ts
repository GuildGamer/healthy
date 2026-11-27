import { HONOR_PALETTE_FILLS, honorInkFor } from './honor-palettes';

/** WCAG AA for the small proof and meta lines on a poster. */
const MIN_CONTRAST = 4.5;

function channel(value: number): number {
  const unit = value / 255;
  return unit <= 0.04045 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const rgb = Number.parseInt(hex.slice(1), 16);
  const red = channel((rgb >> 16) & 255);
  const green = channel((rgb >> 8) & 255);
  const blue = channel(rgb & 255);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(foreground: string, background: string): number {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

describe('honorInkFor', () => {
  it('keeps title and subtext readable on every honor fill', () => {
    for (const [palette, fill] of Object.entries(HONOR_PALETTE_FILLS)) {
      const ink = honorInkFor(palette);
      expect(contrast(ink.text, fill)).toBeGreaterThanOrEqual(MIN_CONTRAST);
      expect(contrast(ink.sub, fill)).toBeGreaterThanOrEqual(MIN_CONTRAST);
    }
  });

  it('uses dark type on the gold crown and cream type everywhere else', () => {
    expect(honorInkFor('champion').text).toBe('#1C1408');
    expect(honorInkFor('honors_board').text).toBe('#F4F2EE');
    expect(honorInkFor('unknown').text).toBe('#F4F2EE');
  });
});
