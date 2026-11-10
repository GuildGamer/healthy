/** Honor poster fills — distinct from activity deck colours so awards stand out. */
export const HONOR_PALETTE_FILLS = {
  champion: '#C9A227',
  comeback: '#D4512A',
  fastest_set: '#1A6B62',
  best_set: '#5C4AE8',
  biggest_day: '#C94A4A',
  photo_finish: '#2A2D3A',
  first_score: '#8B2E2E',
  iron_week: '#3D6B4A',
  honors_board: '#16161C',
  recap: '#4A3D8F',
} as const;

export type HonorPaletteKey = keyof typeof HONOR_PALETTE_FILLS;

export function honorFillFor(palette: string): string {
  if (palette in HONOR_PALETTE_FILLS) {
    return HONOR_PALETTE_FILLS[palette as HonorPaletteKey];
  }
  return HONOR_PALETTE_FILLS.honors_board;
}
