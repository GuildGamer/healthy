import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

/** Catalog data that changes with admin edits, not per person. */
const STARTER_CHALLENGES_STALE_MS = 10 * 60_000;

/** The public starter set, for previewing a first day before an account exists. */
export function useStarterChallenges() {
  return useQuery({
    queryKey: ['challenges', 'starter'],
    queryFn: () => apiClient.listStarterChallenges(),
    staleTime: STARTER_CHALLENGES_STALE_MS,
  });
}
