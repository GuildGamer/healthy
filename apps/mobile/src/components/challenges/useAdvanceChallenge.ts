import type { UserChallengeStatus } from '@product/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

type AdvanceChallengeInput = {
  userChallengeId: string;
  status: UserChallengeStatus;
};

/**
 * Drives the single "advance this challenge" gesture that both the home row and
 * the challenges card expose, so the status ladder lives in one place.
 */
export function useAdvanceChallenge() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ userChallengeId, status }: AdvanceChallengeInput) => {
      if (status === 'in_progress') {
        return apiClient.completeChallenge({ userChallengeId });
      }
      return apiClient.startChallenge({ userChallengeId });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['me'] }),
        queryClient.invalidateQueries({ queryKey: ['challenges', 'today'] }),
        queryClient.invalidateQueries({ queryKey: ['activity'] }),
      ]);
    },
  });

  return {
    advance: (input: AdvanceChallengeInput) => mutation.mutate(input),
    isAdvancing: (userChallengeId: string) =>
      mutation.isPending && mutation.variables?.userChallengeId === userChallengeId,
  };
}
