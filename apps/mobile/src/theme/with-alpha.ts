/**
 * A brand hex at a given opacity, for tinted fills such as a condition's soft
 * circle. Expects the six-digit `#RRGGBB` form the palettes use.
 */
export function withAlpha(hexColor: string, opacity: number): string {
  const clamped = Math.min(Math.max(opacity, 0), 1);
  const alpha = Math.round(clamped * 255)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();
  return `${hexColor}${alpha}`;
}
