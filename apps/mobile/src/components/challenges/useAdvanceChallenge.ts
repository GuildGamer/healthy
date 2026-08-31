import type { UserChallengeStatus } from '@product/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
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
  const router = useRouter();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ userChallengeId, status }: AdvanceChallengeInput) => {
      if (status === 'in_progress') {
        return apiClient.completeChallenge({ userChallengeId });
      }
      return apiClient.startChallenge({ userChallengeId });
    },
    onSuccess: async (result) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['me'] }),
        queryClient.invalidateQueries({ queryKey: ['challenges', 'today'] }),
        queryClient.invalidateQueries({ queryKey: ['challenges', 'history'] }),
        queryClient.invalidateQueries({ queryKey: ['activity'] }),
      ]);

      if ('evidenceRequest' in result && result.evidenceRequest) {
        router.push(`/challenge/${result.challenge.challengeId}/verify`);
      }
    },
  });

  return {
    advance: (input: AdvanceChallengeInput) => mutation.mutate(input),
    isAdvancing: (userChallengeId: string) =>
      mutation.isPending && mutation.variables?.userChallengeId === userChallengeId,
  };
}
