import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { getLocalProofClip } from '@/lib/proof-clip-store';
import type { SetShareClipMedia } from '@/components/share/SetSharePager';

/**
 * Resolves a clip for the set-share pager: phone copy first, then the signed
 * remote URL so a finish filmed on another install still plays.
 */
export function useShareClipMedia(clipId: string | null | undefined) {
  const localQuery = useQuery({
    queryKey: ['proof-clip-local', clipId],
    queryFn: () => (clipId ? getLocalProofClip(clipId) : Promise.resolve(null)),
    enabled: Boolean(clipId),
  });
  const local = localQuery.data ?? null;

  const remoteQuery = useQuery({
    queryKey: ['proof-clip-remote', clipId],
    queryFn: () => apiClient.getProofClip({ clipId: clipId! }),
    enabled: Boolean(clipId) && localQuery.isSuccess && !local,
    retry: 1,
  });
  const remote = remoteQuery.data ?? null;

  const isLoading = Boolean(clipId) && (localQuery.isPending || remoteQuery.isLoading);

  let clip: SetShareClipMedia | null = null;
  if (local?.fileUri) {
    clip = {
      playUri: local.fileUri,
      shareUri: local.fileUri,
      socialShareUri: local.socialFileUri ?? null,
      posterFrameUri: local.posterUri ?? null,
    };
  } else if (remote?.videoUrl) {
    clip = {
      playUri: remote.videoUrl,
      shareUri: remote.videoUrl,
      socialShareUri: null,
      posterFrameUri: remote.posterUrl ?? null,
    };
  }

  return { clip, isLoading };
}
