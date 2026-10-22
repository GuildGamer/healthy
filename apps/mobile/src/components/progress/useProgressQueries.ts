import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export const PROGRESS_DAYS_QUERY_KEY = ['progress', 'days'] as const;

/** For a pull to refresh on You: the week, the days behind it, and the board. */
export function useRefreshProgress(): () => Promise<void> {
  const queryClient = useQueryClient();

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['progress'] }),
      queryClient.invalidateQueries({ queryKey: ['leaderboard'] }),
    ]);
  };
}

export function useProgressDays() {
  return useQuery({
    queryKey: PROGRESS_DAYS_QUERY_KEY,
    queryFn: () => apiClient.listProgressDays(),
  });
}

export function useProgressDay(dayKey: string) {
  return useQuery({
    queryKey: ['progress', 'day', dayKey],
    queryFn: () => apiClient.getProgressDay({ dayKey }),
    enabled: dayKey.length > 0,
  });
}

/** The same key and read as Today's summary, so the two share one fetch. */
export function useWeeklyBoard() {
  return useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => apiClient.listLeaderboard({ period: 'week' }),
  });
}

export function useMeQuery() {
  return useQuery({ queryKey: ['me'], queryFn: () => apiClient.me() });
}
