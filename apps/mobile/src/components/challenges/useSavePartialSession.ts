import type { RecordPracticeSessionInput } from '@product/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { submitQueuedCompletion } from '@/lib/submit-queued-completion';

/**
 * Keeps a measured session that fell short of the goal as progress on Today's
 * card. Queued first so a flaky network still lands the progress when back
 * online; a retryable failure is not surfaced as a hard error.
 */
export function useSavePartialSession() {
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationFn: async (session: RecordPracticeSessionInput) => {
      const queued = await submitQueuedCompletion({
        kind: 'record_practice',
        input: session,
      });
      if (queued.outcome === 'failed') {
        throw queued.error instanceof Error ? queued.error : new Error('That didn’t save.');
      }
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
