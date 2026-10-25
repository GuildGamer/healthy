import type { MatchBoard } from '@product/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { apiClient } from '@/lib/api';
import { createPrefillParams, rerunCreateInput } from './group-rerun';
import { shareMatchLink } from './share-match-link';

/** Keep in sync with `CREW_NAME_MAX` in `@product/contract`. */
const CREW_NAME_MAX = 40;

/**
 * Saving the crew is how the same people come back: it dedupes against one
 * already saved, and a member who left that crew stays out of the next group.
 * A group nobody else joined has no crew, so it starts again by link.
 */
export function useRunItBack(board: MatchBoard) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const hasOthers = board.participantCount > 1;

  const saveCrew = useMutation({
    mutationFn: (name?: string) => {
      const trimmed = name?.trim().slice(0, CREW_NAME_MAX);
      return apiClient.saveCrew({
        matchId: board.id,
        ...(trimmed ? { name: trimmed } : {}),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['crews'] });
    },
  });

  async function crewIdForRerun(): Promise<string | null> {
    if (!hasOthers) {
      return null;
    }

    const saved = await saveCrew.mutateAsync(undefined);
    return saved.crew.id;
  }

  const start = useMutation({
    mutationFn: async () => {
      const crewId = await crewIdForRerun();
      const created = await apiClient.createMatch(rerunCreateInput(board, crewId));
      return { created, crewId };
    },
    onSuccess: async ({ created, crewId }) => {
      await queryClient.invalidateQueries({ queryKey: ['matches'] });
      if (!crewId) {
        await shareMatchLink({
          url: created.match.inviteUrl,
          hostScore: created.match.yourScore,
          metric: created.match.metric,
          scoringMode: created.match.scoringMode,
          endsAt: created.match.endsAt,
        });
      }
      router.replace(`/matches/${created.match.id}`);
    },
  });

  const change = useMutation({
    mutationFn: crewIdForRerun,
    onSuccess: (crewId) => {
      router.replace({ pathname: '/matches/create', params: createPrefillParams(board, crewId) });
    },
  });

  return {
    saveCrew: (name?: string) => saveCrew.mutate(name),
    isCrewSaved: saveCrew.isSuccess,
    hasCrewSaveFailed: saveCrew.isError && !start.isPending && !change.isPending,
    start: () => start.mutate(),
    change: () => change.mutate(),
    isBusy: start.isPending || change.isPending,
    hasRerunFailed: start.isError || change.isError,
  };
}
