import type { HealthCategory, LeaderboardPeriod } from '@product/contract';

export type LeaderboardEntryDto = {
  rank: number;
  displayName: string;
  points: number;
  isCurrentUser: boolean;
};

export type ListLeaderboardQuery = {
  period?: LeaderboardPeriod;
  category?: HealthCategory;
};

export type ListLeaderboardDto = {
  weekStart: string;
  period: LeaderboardPeriod;
  periodStart: string | null;
  entries: LeaderboardEntryDto[];
  currentUserRank: number | null;
  currentUserPoints: number;
};
