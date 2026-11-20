import type { MatchHonorKind } from '@product/client';

/** Keep in sync with API `HONOR_PRIMARY_ORDER` in match-honors.ts. */
export const HONOR_PRIMARY_ORDER: readonly MatchHonorKind[] = [
  'comeback',
  'photo_finish',
  'fastest_set',
  'best_set',
  'biggest_day',
  'first_score',
  'iron_week',
  'champion',
] as const;
