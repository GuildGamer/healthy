import type { CatalogChallenge, HealthCategory } from '@product/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { pickFirstRunSuggestions } from '@/lib/first-run-suggestions';

/** Only asks for the catalog while the day is empty. */
export function useFirstRunSuggestions(isDayEmpty: boolean, categories: readonly HealthCategory[]) {
  const queryClient = useQueryClient();
  const catalogQuery = useQuery({
    queryKey: ['challenges', 'catalog'],
    queryFn: () => apiClient.listChallengeCatalog(),
    enabled: isDayEmpty,
  });

  const enrollMutation = useMutation({
    mutationFn: (challengeId: string) =>
      apiClient.setChallengeEnrollment({ challengeId, isEnrolled: true }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['challenges', 'today'] }),
        queryClient.invalidateQueries({ queryKey: ['challenges', 'catalog'] }),
      ]),
  });

  const suggestions: CatalogChallenge[] = pickFirstRunSuggestions(
    catalogQuery.data?.challenges ?? [],
    categories,
  );

  return {
    suggestions,
    enroll: (challengeId: string) => enrollMutation.mutate(challengeId),
    isEnrolling: (challengeId: string) =>
      enrollMutation.isPending && enrollMutation.variables === challengeId,
  };
}
