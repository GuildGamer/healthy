import type { HealthCategory, LeaderboardPeriod } from '@product/client';
import { healthCategories } from '@/constants/health-categories';

export const LEADERBOARD_PERIODS: readonly {
  id: LeaderboardPeriod;
  label: string;
}[] = [
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'This month' },
  { id: 'all', label: 'All time' },
];

export type LeaderboardCategoryFilter = HealthCategory | 'all';

export const LEADERBOARD_CATEGORIES: readonly {
  id: LeaderboardCategoryFilter;
  label: string;
}[] = [
  { id: 'all', label: 'All' },
  ...healthCategories.map((option) => ({
    id: option.id,
    label: option.name,
  })),
];

export function leaderboardIntro(period: LeaderboardPeriod): string {
  if (period === 'month') {
    return 'Points earned this month. Everyone starts level again on the 1st.';
  }

  if (period === 'all') {
    return 'All-time points. The running total.';
  }

  return 'Points earned since Monday. Everyone starts level again each week.';
}

export function leaderboardRankWindow(period: LeaderboardPeriod): string {
  if (period === 'month') {
    return 'this month';
  }

  if (period === 'all') {
    return 'all time';
  }

  return 'this week';
}

export function leaderboardQueryInput(
  period: LeaderboardPeriod,
  category: LeaderboardCategoryFilter,
): { period: LeaderboardPeriod; category?: HealthCategory } {
  if (category === 'all') {
    return { period };
  }

  return { period, category };
}
