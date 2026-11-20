import type { CompleteChallengeInput, TodayChallenge } from '@product/client';
import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';
import { submitQueuedCompletion } from '@/lib/submit-queued-completion';

export type CompletionPayload = Omit<CompleteChallengeInput, 'userChallengeId'>;

type CompleteChallengeVariables = {
  /**
   * At least id + status for the outbox; full Today rows keep the card flip
   * when a syncing finish announces locally.
   */
  occurrence: Pick<TodayChallenge, 'id' | 'status'> & Partial<TodayChallenge>;
  payload: CompletionPayload;
};

/** Points, Today, and You — a contest set fills the week card without a pull. */
export function refreshAfterCompletion(queryClient: QueryClient): void {
  void Promise.all([
    queryClient.invalidateQueries({ queryKey: ['me'] }),
    queryClient.invalidateQueries({ queryKey: ['challenges', 'today'] }),
    queryClient.invalidateQueries({ queryKey: ['home', 'bootstrap'] }),
    queryClient.invalidateQueries({ queryKey: ['progress'] }),
  ]);
}

/**
 * Queues the finish first, then tries the API once. A retryable network failure
 * still resolves so the walker can leave; the set syncs in the background.
 */
export function useCompleteChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ occurrence, payload }: CompleteChallengeVariables) => {
      const queued = await submitQueuedCompletion({
        kind: 'complete_challenge',
        userChallengeId: occurrence.id,
        occurrenceStatus: occurrence.status,
        payload,
      });

      if (queued.outcome === 'failed') {
        throw queued.error instanceof Error ? queued.error : new Error('That didn’t save.');
      }

      if (queued.outcome === 'syncing') {
        return {
          challenge: occurrence as TodayChallenge,
          pointsAwarded: 0,
          pointsBalance: 0,
          currentStreakDays: 0,
          evidenceRequest: null,
          penaltyApplied: 0,
          syncing: true as const,
        };
      }

      if (queued.executed.kind !== 'complete_challenge') {
        throw new Error('Unexpected challenge result.');
      }

      return { ...queued.executed.result, syncing: false as const };
    },
    onSuccess: () => refreshAfterCompletion(queryClient),
  });
}
