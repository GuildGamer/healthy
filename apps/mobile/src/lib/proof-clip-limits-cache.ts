import type { MeOutput } from '@product/contract';
import {
  PROOF_CLIP_MAX_BYTES,
  PROOF_CLIP_MAX_DURATION_SECONDS,
  PROOF_CLIP_POSTER_MAX_BYTES,
} from '@product/contract/proof-clip-limits';
import type { QueryClient } from '@tanstack/react-query';

export function defaultProofClipLimits(): MeOutput['proofClipLimits'] {
  return {
    maxDurationSeconds: PROOF_CLIP_MAX_DURATION_SECONDS,
    maxVideoBytes: PROOF_CLIP_MAX_BYTES,
    maxPosterBytes: PROOF_CLIP_POSTER_MAX_BYTES,
  };
}

/** Uses the last `/me` payload when present so poster/video caps track the server. */
export function proofClipLimitsFromQuery(queryClient: QueryClient): MeOutput['proofClipLimits'] {
  const me = queryClient.getQueryData<MeOutput>(['me']);
  return me?.proofClipLimits ?? defaultProofClipLimits();
}

export function proofClipLimitsForUpload(
  queryClient: QueryClient | null | undefined,
): MeOutput['proofClipLimits'] {
  if (!queryClient) {
    return defaultProofClipLimits();
  }
  return proofClipLimitsFromQuery(queryClient);
}
