import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

/** The catalogue with your enrolments, this period's occurrences, and what Today knows about each. */
export function useChallengeQueries() {
  const catalogQuery = useQuery({
    queryKey: ['challenges', 'catalog'],
    queryFn: () => apiClient.listChallengeCatalog(),
  });
  const todayQuery = useQuery({
    queryKey: ['challenges', 'today'],
    queryFn: () => apiClient.listTodayChallenges(),
  });
  const dayKey = todayQuery.data?.dayKey ?? '';
  // Same key as Today's, so one fetch serves both; it waits for the list that creates the occurrences.
  const detailsQuery = useQuery({
    queryKey: ['challenges', 'today', 'details', dayKey],
    queryFn: () => apiClient.getTodayDetails(),
    enabled: todayQuery.isSuccess,
  });

  return { catalogQuery, todayQuery, detailsQuery };
}
