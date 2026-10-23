import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import {
  NATIVE_MOVEMENT_UNAVAILABLE,
  requestMovementAccess,
  requestSleepHealthAccess,
} from '@/lib/device-health';

const HEALTH_LINK_SAVE_FAILED_MESSAGE = 'We could not save that choice. Try again.';

/**
 * Asks the phone for sleep (Apple Health / Health Connect) plus motion and
 * location, then records one status for this install.
 */
export function useHealthLink({ onSaved }: { onSaved?: () => void } = {}) {
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationFn: async (choice: 'connected' | 'denied') => {
      if (choice === 'denied') {
        return apiClient.updateHealthLink({ status: 'denied' });
      }

      const sleepStatus = await requestSleepHealthAccess();
      let movementStatus: 'connected' | 'denied' = 'denied';
      try {
        movementStatus = await requestMovementAccess();
      } catch (error) {
        if (sleepStatus === 'connected') {
          return apiClient.updateHealthLink({ status: 'connected' });
        }
        throw error;
      }

      const status =
        sleepStatus === 'connected' || movementStatus === 'connected' ? 'connected' : 'denied';
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
