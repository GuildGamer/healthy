import type { CompleteChallengeInput, TodayChallenge } from '@product/client';
import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export type CompletionPayload = Omit<CompleteChallengeInput, 'userChallengeId'>;

type CompleteChallengeVariables = {
  occurrence: Pick<TodayChallenge, 'id' | 'status'>;
  payload: CompletionPayload;
};

/** Everything a finish can move: points, today, history, activity, and any live group. */
export function refreshAfterCompletion(queryClient: QueryClient): void {
  void Promise.all([
    queryClient.invalidateQueries({ queryKey: ['me'] }),
    queryClient.invalidateQueries({ queryKey: ['challenges', 'today'] }),
    queryClient.invalidateQueries({ queryKey: ['challenges', 'history'] }),
    queryClient.invalidateQueries({ queryKey: ['activity'] }),
    queryClient.invalidateQueries({ queryKey: ['matches'] }),
  ]);
}

/** Starts the occurrence if it never was, then finishes it with whatever proof the act produced. */
export function useCompleteChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ occurrence, payload }: CompleteChallengeVariables) => {
      if (occurrence.status === 'pending') {
        await apiClient.startChallenge({ userChallengeId: occurrence.id });
      }

      return apiClient.completeChallenge({ userChallengeId: occurrence.id, ...payload });
    },
    onSuccess: () => refreshAfterCompletion(queryClient),
  });
}
