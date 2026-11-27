import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { apiClient } from '@/lib/api';
import { pendingSharePhotoFor } from '@/lib/share-card-session';

/**
 * Local pending selfie first; otherwise the owner signed URL while retention
 * still holds. History opens with no local file after the success screen clears.
 */
export function useGymSharePhoto(input: {
  userChallengeId?: string;
  /** Only fetch when this finish is a gym share. */
  enabled: boolean;
}): { photoUri: string | undefined; isLoading: boolean } {
  const [localUri] = useState(() => pendingSharePhotoFor(input.userChallengeId));
  const remote = useQuery({
    queryKey: ['gym-share-photo', input.userChallengeId],
    queryFn: () => apiClient.getGymSharePhoto({ userChallengeId: input.userChallengeId! }),
    enabled: input.enabled && Boolean(input.userChallengeId) && !localUri,
    staleTime: 60_000,
  });

  return {
    photoUri: localUri ?? remote.data?.photoUrl ?? undefined,
    isLoading: !localUri && remote.isPending && input.enabled,
  };
}
