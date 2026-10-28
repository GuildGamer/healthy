import {
  PROOF_CLIP_BIT_RATE_MAX,
  PROOF_CLIP_BIT_RATE_MIN,
  PROOF_CLIP_DEFAULT_ENCODING,
  PROOF_CLIP_FRAME_RATE_MAX,
  PROOF_CLIP_FRAME_RATE_MIN,
  PROOF_CLIP_HEIGHT_MAX,
  PROOF_CLIP_HEIGHT_MIN,
  PROOF_CLIP_WIDTH_MAX,
  PROOF_CLIP_WIDTH_MIN,
  type ProofClipEncodingLimits,
} from '@product/contract/proof-clip-limits';

export type ProofClipEncoding = ProofClipEncodingLimits;

/**
 * Picks the encoder profile for a set. A complete, in-range server profile
 * wins; anything else falls back to the on-device defaults so recording never
 * waits on a second request.
 */
export function resolveProofClipEncoding(
  encoding: ProofClipEncoding | null | undefined,
): ProofClipEncoding {
  if (!encoding || !isValidProofClipEncoding(encoding)) {
    return { ...PROOF_CLIP_DEFAULT_ENCODING };
  }
  return {
    bitRate: encoding.bitRate,
    frameRate: encoding.frameRate,
    width: encoding.width,
    height: encoding.height,
  };
}

function isValidProofClipEncoding(encoding: ProofClipEncoding): boolean {
  return (
    isIntInRange(encoding.bitRate, PROOF_CLIP_BIT_RATE_MIN, PROOF_CLIP_BIT_RATE_MAX) &&
    isIntInRange(encoding.frameRate, PROOF_CLIP_FRAME_RATE_MIN, PROOF_CLIP_FRAME_RATE_MAX) &&
    isEvenInRange(encoding.width, PROOF_CLIP_WIDTH_MIN, PROOF_CLIP_WIDTH_MAX) &&
    isEvenInRange(encoding.height, PROOF_CLIP_HEIGHT_MIN, PROOF_CLIP_HEIGHT_MAX)
  );
}

function isIntInRange(value: number, min: number, max: number): boolean {
  return Number.isInteger(value) && value >= min && value <= max;
}

function isEvenInRange(value: number, min: number, max: number): boolean {
  return isIntInRange(value, min, max) && value % 2 === 0;
}
