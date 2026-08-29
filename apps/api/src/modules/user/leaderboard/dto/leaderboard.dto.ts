export type LeaderboardEntryDto = {
  rank: number;
  displayName: string;
  points: number;
  isCurrentUser: boolean;
};

export type ListLeaderboardDto = {
  weekStart: string;
  entries: LeaderboardEntryDto[];
  currentUserRank: number | null;
  currentUserPoints: number;
};
