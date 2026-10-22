import type { LeaderboardEntryDto } from '../dto/index.js';

export type UserTotal = {
  userId: string;
  points: number;
};

/** Where the caller sits, and the rows around them. */
export type CurrentUserStanding = {
  rank: number | null;
  around: LeaderboardEntryDto[];
};
