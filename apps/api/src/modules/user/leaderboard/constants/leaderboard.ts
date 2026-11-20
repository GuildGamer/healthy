import type { CurrentUserStanding } from '../types/standing.js';

/** Deep enough to feel like a community, short enough to stay scannable. */
export const LEADERBOARD_SIZE = 50;

/** People shown above and below the caller, so the next place is in reach. */
export const NEIGHBOURS_EACH_SIDE = 2;

export const NO_STANDING: CurrentUserStanding = { rank: null, around: [] };
