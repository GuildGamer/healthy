import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { posterRunLine } from './share-poster';

/**
 * The "N days running" line for one finish. Reads the consecutive days this
 * challenge was finished ending on that finish — never the account-wide streak.
 * Stays null until the number arrives, so a wrong streak never flashes.
 */
export function useActivityRunLine(userChallengeId: string | undefined): string | null {
  const query = useQuery({
    queryKey: ['activity-run', userChallengeId],
    queryFn: () => apiClient.getActivityRun({ userChallengeId: userChallengeId! }),
    enabled: Boolean(userChallengeId),
    staleTime: 60_000,
  });

  if (!query.data) {
    return null;
  }

  return posterRunLine(query.data.runDays);
}
