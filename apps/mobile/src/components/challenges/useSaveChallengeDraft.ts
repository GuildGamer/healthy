import type { ChallengeDraft } from '@product/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api';

const SAVE_DELAY_MS = 400;

export function useSaveChallengeDraft(userChallengeId: string | undefined) {
  const queryClient = useQueryClient();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useMutation({
    mutationFn: (draft: ChallengeDraft) => {
      if (!userChallengeId) {
        throw new Error('Challenge is not ready');
      }

      return apiClient.saveChallengeDraft({ userChallengeId, draft });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['challenges', 'today'] });
    },
  });

  useEffect(() => {
    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, []);

  function schedule(draft: ChallengeDraft) {
    if (!userChallengeId) {
      return;
    }

    if (timer.current) {
      clearTimeout(timer.current);
    }

    timer.current = setTimeout(() => {
      save.mutate(draft);
    }, SAVE_DELAY_MS);
  }

  return { schedule, saveNow: save.mutateAsync, isSaving: save.isPending };
}
