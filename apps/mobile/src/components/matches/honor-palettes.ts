/**
 * Honor poster fills — distinct from activity deck colours so awards stand out.
 * Deep enough for cream type, except the crown, which stays gold.
 */
export const HONOR_PALETTE_FILLS = {
  champion: '#C9A227',
  comeback: '#AA4122',
  fastest_set: '#1A6B62',
  best_set: '#5C4AE8',
  biggest_day: '#AB3F3F',
  photo_finish: '#2A2D3A',
  first_score: '#8B2E2E',
  iron_week: '#3D6B4A',
  honors_board: '#16161C',
  recap: '#4A3D8F',
} as const;

export type HonorPaletteKey = keyof typeof HONOR_PALETTE_FILLS;

export type HonorInk = {
  text: string;
  sub: string;
  track: string;
};

/** Cream type for the deep fills. Sub clears 4.5:1 on the lightest of them. */
const INK_ON_DEEP: HonorInk = {
  text: '#F4F2EE',
  sub: '#E7E2DA',
  track: 'rgba(244, 242, 238, 0.28)',
};

/** Dark type for the gold crown. Cream on `#C9A227` sits under 2.2:1. */
const INK_ON_GOLD: HonorInk = {
  text: '#1C1408',
  sub: '#3D3010',
  track: 'rgba(28, 20, 8, 0.32)',
};

export function honorFillFor(palette: string): string {
  if (palette in HONOR_PALETTE_FILLS) {
    return HONOR_PALETTE_FILLS[palette as HonorPaletteKey];
  }
  return HONOR_PALETTE_FILLS.honors_board;
}

export function honorInkFor(palette: string): HonorInk {
  if (palette === 'champion') {
    return INK_ON_GOLD;
  }
  return INK_ON_DEEP;
}
