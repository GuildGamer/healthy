import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { NATIVE_MOVEMENT_UNAVAILABLE, requestMovementAccess } from '@/lib/device-health';

const HEALTH_LINK_SAVE_FAILED_MESSAGE = 'We could not save that choice. Try again.';

/** Asks the phone for motion and location, then records the answer for this install. */
export function useHealthLink({ onSaved }: { onSaved?: () => void } = {}) {
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationFn: async (choice: 'connected' | 'denied') => {
      if (choice === 'denied') {
        return apiClient.updateHealthLink({ status: 'denied' });
      }

      const status = await requestMovementAccess();
      return apiClient.updateHealthLink({ status });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      onSaved?.();
    },
  });

  const errorMessage =
    save.error instanceof Error && save.error.message === NATIVE_MOVEMENT_UNAVAILABLE
      ? NATIVE_MOVEMENT_UNAVAILABLE
      : HEALTH_LINK_SAVE_FAILED_MESSAGE;

  return {
    allow: () => save.mutate('connected'),
    decline: () => save.mutate('denied'),
    isSaving: save.isPending,
    errorMessage: save.isError ? errorMessage : null,
  };
}
