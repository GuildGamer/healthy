import type { RecordPracticeSessionInput } from '@product/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

/**
 * Keeps a measured session that fell short of the goal as progress on Today's
 * card. It is stored like a practice session: no points, and the challenge
 * stays open. The session's own externalId makes every save of it one row.
 */
export function useSavePartialSession() {
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationFn: (session: RecordPracticeSessionInput) => apiClient.recordPracticeSession(session),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['challenges', 'today'] }),
        queryClient.invalidateQueries({ queryKey: ['activity'] }),
        queryClient.invalidateQueries({ queryKey: ['practice'] }),
      ]),
  });

  return { savePartial: (session: RecordPracticeSessionInput) => save.mutate(session) };
}
