import type { MatchBoard, MatchReactionKind } from '@product/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { apiClient } from '@/lib/api';

/** The board, and the three things a member can do to it besides playing. */
export function useGroupBoard(matchId: string) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const detailKey = ['matches', 'detail', matchId];
  const matchQuery = useQuery({
    queryKey: detailKey,
    queryFn: () => apiClient.getMatch({ matchId }),
  });

  async function showBoard(board: MatchBoard) {
    queryClient.setQueryData(detailKey, board);
    await queryClient.invalidateQueries({ queryKey: ['matches', 'mine'] });
  }

  const cancel = useMutation({
    mutationFn: () => apiClient.cancelMatch({ matchId }),
    onSuccess: showBoard,
  });

  const leave = useMutation({
    mutationFn: () => apiClient.leaveMatch({ matchId }),
    onSuccess: async (list) => {
      queryClient.setQueryData(['matches', 'mine'], list);
      router.replace('/(tabs)/challenges');
    },
  });

  const react = useMutation({
    mutationFn: (input: { toUserId: string; kind: MatchReactionKind }) =>
      apiClient.reactToMatchMember({ matchId, ...input }),
    onSuccess: showBoard,
  });

  return { matchQuery, cancel, leave, react };
}
