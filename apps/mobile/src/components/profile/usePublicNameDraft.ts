import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { apiClient } from '@/lib/api';
import { isValidPublicName, PUBLIC_NAME_MAX_LENGTH } from '@/lib/public-name';
import { ME_QUERY_KEY } from './useMe';

/**
 * The name others see, as typed. Save only appears once it differs from what
 * is saved, and stays grey until it passes the same rule the API enforces.
 */
export function usePublicNameDraft(savedName: string) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? savedName;
  const trimmed = value.trim();
  const isChanged = draft !== null && trimmed !== savedName;
  const isValid = isValidPublicName(trimmed);

  const mutation = useMutation({
    mutationFn: (displayName: string) => apiClient.updateDisplayName({ displayName }),
    onSuccess: async () => {
      setDraft(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ME_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ['leaderboard'] }),
        queryClient.invalidateQueries({ queryKey: ['matches'] }),
      ]);
    },
  });

  function save() {
    if (!isChanged || !isValid || mutation.isPending) {
      return;
    }

    mutation.mutate(trimmed);
  }

  return {
    value,
    setValue: setDraft,
    counter: `${value.length} of ${PUBLIC_NAME_MAX_LENGTH}`,
    isChanged,
    isInvalid: isChanged && !isValid,
    canSave: isChanged && isValid && !mutation.isPending,
    isSaving: mutation.isPending,
    hasFailed: mutation.isError,
    save,
  };
}
