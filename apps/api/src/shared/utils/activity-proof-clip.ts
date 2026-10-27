import { type ActivityProofClip, toDisplayProofCode } from '@product/contract';
import type { ProofClipAudience, ProofClipStatus } from '@product/db';

export type ActivityProofClipRow = {
  id: string;
  code: string;
  status: ProofClipStatus;
  audience: ProofClipAudience | null;
  postedToGroupAt: Date | null;
};

function isListedStatus(status: ProofClipStatus): status is ActivityProofClip['status'] {
  return status === 'recorded' || status === 'ready' || status === 'expired';
}

/** The clip a History row links to, from rows selected with `ACTIVITY_PROOF_CLIP_ARGS`. */
export function activityProofClipFrom(
  rows: readonly ActivityProofClipRow[] | undefined,
): ActivityProofClip | null {
  const clip = rows?.[0];
  if (!clip || !isListedStatus(clip.status)) {
    return null;
  }

  return {
    id: clip.id,
    displayCode: toDisplayProofCode(clip.code),
    status: clip.status,
    audience: clip.audience,
    isPostedToGroup: clip.postedToGroupAt != null,
  };
}
