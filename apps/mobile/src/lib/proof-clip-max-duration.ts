import { PROOF_CLIP_MAX_DURATION_SECONDS } from '@product/contract/proof-clip-limits';
import type { MeOutput } from '@product/contract';

export function proofClipMaxDurationSeconds(limits: MeOutput['proofClipLimits'] | null | undefined): number {
  return limits?.maxDurationSeconds ?? PROOF_CLIP_MAX_DURATION_SECONDS;
}
