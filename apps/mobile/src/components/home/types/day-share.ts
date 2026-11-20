/** Everything the day's share card may say. Counts only, by construction. */
export type DayShareContent = {
  weekday: string;
  dateLabel: string;
  completedCount: number;
  totalCount: number;
  pointsToday: number;
  streakDays: number;
};
