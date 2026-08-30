/** Same metals as the board medals — gold, silver, bronze. */
const PODIUM_MEDAL_COLORS = {
  1: '#FACC15',
  2: '#CBD5E1',
  3: '#D97706',
} as const;

export function podiumMedalColor(rank: number): string | undefined {
  if (rank === 1 || rank === 2 || rank === 3) {
    return PODIUM_MEDAL_COLORS[rank];
  }

  return undefined;
}
