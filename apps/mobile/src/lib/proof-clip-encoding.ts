import { proofClipEncodingSchema } from '@product/contract/proof-clip-encoding-schema';
import { PROOF_CLIP_DEFAULT_ENCODING } from '@product/contract/proof-clip-limits';

export type ProofClipEncoding = typeof PROOF_CLIP_DEFAULT_ENCODING;

/**
 * Picks the encoder profile for a set. A response that passes the contract
 * schema wins; anything else falls back so recording never waits on a second
 * request.
 */
export function resolveProofClipEncoding(
  encoding: Partial<ProofClipEncoding> | null | undefined,
): ProofClipEncoding {
  const parsed = proofClipEncodingSchema.safeParse(encoding);
  if (parsed.success) {
    return parsed.data;
  }
  return { ...PROOF_CLIP_DEFAULT_ENCODING };
}
