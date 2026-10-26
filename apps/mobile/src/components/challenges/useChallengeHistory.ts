import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { mergeTodayIntoHistory } from './challenge-history';
import { useChallengeQueries } from './useChallengeQueries';

/** One challenge's history, with today's finish folded in before the server has it. */
export function useChallengeHistory(challengeId: string) {
  const { todayQuery, detailsQuery, catalogQuery } = useChallengeQueries();
  const historyQuery = useQuery({
    queryKey: ['challenges', 'history', challengeId],
    queryFn: () => apiClient.listChallengeHistory({ challengeId }),
  });
  const occurrence = todayQuery.data?.challenges.find((item) => item.challengeId === challengeId);
  const completedAt =
    detailsQuery.data?.occurrences.find((item) => item.userChallengeId === occurrence?.id)
      ?.completedAt ?? null;

  return {
    historyQuery,
    entries: mergeTodayIntoHistory(historyQuery.data?.entries ?? [], occurrence, completedAt),
    challenge:
      catalogQuery.data?.challenges.find((item) => item.challengeId === challengeId) ?? null,
  };
}
