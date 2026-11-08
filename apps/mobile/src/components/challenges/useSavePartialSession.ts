import type { RecordPracticeSessionInput } from '@product/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  removePendingCompletion,
  upsertPendingCompletion,
} from '@/lib/completion-outbox';
import { executePendingCompletion } from '@/lib/execute-pending-completion';

/**
 * Keeps a measured session that fell short of the goal as progress on Today's
 * card. It is stored like a practice session: no points, and the challenge
 * stays open. The session's own externalId makes every save of it one row.
 * Queued first so a flaky network still lands the progress when back online.
 */
export function useSavePartialSession() {
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationFn: async (session: RecordPracticeSessionInput) => {
      const pending = await upsertPendingCompletion({
        kind: 'record_practice',
        input: session,
      });
      await executePendingCompletion(pending);
      await removePendingCompletion(pending.id);
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['challenges', 'today'] }),
        queryClient.invalidateQueries({ queryKey: ['activity'] }),
        queryClient.invalidateQueries({ queryKey: ['practice'] }),
      ]),
  });

  return { savePartial: (session: RecordPracticeSessionInput) => save.mutate(session) };
}
