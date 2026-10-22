import type {
  CompleteChallengeOutput,
  ListTodayChallengesOutput,
  TodayChallenge,
} from '@product/client';
import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useCompleteChallenge } from './useCompleteChallenge';
import { waterGlassDraft, waterGlassGoal } from './water-glasses';

type WaterOccurrence = Pick<TodayChallenge, 'id' | 'status' | 'capture'>;

type SetGlassesHandlers = {
  onFinished: (result: CompleteChallengeOutput) => void;
  onError: (error: unknown) => void;
};

/** Moves the numeral straight away; the draft save catches up behind it. */
function showGlassesNow(queryClient: QueryClient, occurrenceId: string, glasses: number): void {
  queryClient.setQueryData<ListTodayChallengesOutput>(['challenges', 'today'], (today) => {
    if (!today) {
      return today;
    }

    return {
      ...today,
      challenges: today.challenges.map((challenge) =>
        challenge.id === occurrenceId
          ? {
              ...challenge,
              status: challenge.status === 'pending' ? 'in_progress' : challenge.status,
              draft: waterGlassDraft(glasses),
            }
          : challenge,
      ),
    };
  });
}

/**
 * Water kept as a running total: each glass saves to the draft, and the glass
 * that reaches the goal finishes the challenge with the whole day's count.
 */
export function useWaterGlasses() {
  const queryClient = useQueryClient();
  const complete = useCompleteChallenge();
  const saveDraft = useMutation({
    mutationFn: ({ occurrenceId, glasses }: { occurrenceId: string; glasses: number }) =>
      apiClient.saveChallengeDraft({
        userChallengeId: occurrenceId,
        draft: waterGlassDraft(glasses),
      }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['challenges', 'today'] }),
  });

  function setGlasses(
    occurrence: WaterOccurrence,
    glasses: number,
    handlers: SetGlassesHandlers,
  ): void {
    const count = Math.max(glasses, 0);

    if (count >= waterGlassGoal(occurrence)) {
      complete.mutate(
        { occurrence, payload: { water: { amount: count, unit: 'glasses' } } },
        { onSuccess: handlers.onFinished, onError: handlers.onError },
      );
      return;
    }

    showGlassesNow(queryClient, occurrence.id, count);
    saveDraft.mutate(
      { occurrenceId: occurrence.id, glasses: count },
      { onError: handlers.onError },
    );
  }

  return {
    setGlasses,
    isFinishing: (occurrenceId: string) =>
      complete.isPending && complete.variables?.occurrence.id === occurrenceId,
    isSaving: saveDraft.isPending || complete.isPending,
  };
}
