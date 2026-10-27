import type { ActivityProofClip, ProofClipAudience } from '@product/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { getLocalProofClip, listLocalProofClips } from '@/lib/proof-clip-store';
import { useProofClip } from './useProofClip';

/**
 * The clip behind one History row. The phone's copy plays first, so a clip
 * that was never published still plays; the server's signed copy covers a
 * clip filmed on another install. A finish History has not caught up with
 * yet is matched to the phone's clip by its occurrence.
 */
export function useActivityClip(summary: ActivityProofClip | null, userChallengeId: string | null) {
  const queryClient = useQueryClient();
  const fallbackQuery = useQuery({
    queryKey: ['proof-clip-local-id-by-challenge', userChallengeId],
    queryFn: async () => {
      const clips = await listLocalProofClips();
      return clips.find((clip) => clip.userChallengeId === userChallengeId)?.clipId ?? null;
    },
    enabled: !summary && Boolean(userChallengeId),
  });
  const clipId = summary?.id ?? fallbackQuery.data ?? null;

  const localQuery = useQuery({
    queryKey: ['proof-clip-local', clipId],
    queryFn: () => (clipId ? getLocalProofClip(clipId) : Promise.resolve(null)),
    enabled: Boolean(clipId),
  });
  const local = localQuery.data ?? null;
  const isGroup = Boolean(local?.matchId ?? summary?.isPostedToGroup);
  const audience: ProofClipAudience = summary?.audience ?? 'anyone';

  const remoteQuery = useQuery({
    queryKey: ['proof-clip-remote', clipId],
    queryFn: () => apiClient.getProofClip({ clipId: clipId! }),
    enabled: Boolean(clipId) && summary?.status === 'ready' && localQuery.isSuccess && !local,
    retry: 1,
  });

  const proof = useProofClip(clipId, audience, {
    isGroup,
    onPublished: () => {
      void queryClient.invalidateQueries({ queryKey: ['progress'] });
      void queryClient.invalidateQueries({ queryKey: ['challenges', 'history'] });
    },
  });

  const remote = remoteQuery.data ?? null;
  const isUploaded = summary?.status === 'ready' || proof.hasUploaded || remote != null;

  return {
    clipId,
    proof,
    videoUri: local?.fileUri ?? remote?.videoUrl ?? null,
    posterUri: local?.posterUri ?? remote?.posterUrl ?? null,
    displayCode: summary?.displayCode ?? local?.displayCode ?? remote?.displayCode ?? null,
    audience: proof.audience,
    isUploaded,
    isPostedToGroup: summary?.isPostedToGroup === true || (proof.hasUploaded && isGroup),
    canAct: Boolean(local) || isUploaded,
    isExpired: summary?.status === 'expired' && !local,
    isLoading: Boolean(clipId) && (localQuery.isPending || remoteQuery.isLoading),
  };
}

export type ActivityClipState = ReturnType<typeof useActivityClip>;
