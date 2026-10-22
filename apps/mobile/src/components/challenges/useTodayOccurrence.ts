import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

/** Today's occurrence of one catalog challenge, from the list Today already holds. */
export function useTodayOccurrence(challengeId: string | undefined) {
  const todayQuery = useQuery({
    queryKey: ['challenges', 'today'],
    queryFn: () => apiClient.listTodayChallenges(),
    enabled: challengeId !== undefined,
  });

  return {
    occurrence: todayQuery.data?.challenges.find((item) => item.challengeId === challengeId),
    isPending: todayQuery.isPending,
  };
}
