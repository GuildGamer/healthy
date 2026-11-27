import { z } from 'zod';
import {
  PROOF_CLIP_ENCODING_BIT_RATE_MAX,
  PROOF_CLIP_ENCODING_BIT_RATE_MIN,
  PROOF_CLIP_ENCODING_FRAME_RATE_MAX,
  PROOF_CLIP_ENCODING_FRAME_RATE_MIN,
  PROOF_CLIP_ENCODING_HEIGHT_MAX,
  PROOF_CLIP_ENCODING_HEIGHT_MIN,
  PROOF_CLIP_ENCODING_WIDTH_MAX,
  PROOF_CLIP_ENCODING_WIDTH_MIN,
} from './proof-clip-limits.js';

/** On-device encoder settings the phone takes from reserve (server-driven). */
export const proofClipEncodingSchema = z.object({
  bitRate: z
    .number()
    .int()
    .min(PROOF_CLIP_ENCODING_BIT_RATE_MIN)
    .max(PROOF_CLIP_ENCODING_BIT_RATE_MAX),
  frameRate: z
    .number()
    .int()
    .min(PROOF_CLIP_ENCODING_FRAME_RATE_MIN)
    .max(PROOF_CLIP_ENCODING_FRAME_RATE_MAX),
  width: z
    .number()
    .int()
    .min(PROOF_CLIP_ENCODING_WIDTH_MIN)
    .max(PROOF_CLIP_ENCODING_WIDTH_MAX)
    .refine((value) => value % 2 === 0, { message: 'width must be even' }),
  height: z
    .number()
    .int()
    .min(PROOF_CLIP_ENCODING_HEIGHT_MIN)
    .max(PROOF_CLIP_ENCODING_HEIGHT_MAX)
    .refine((value) => value % 2 === 0, { message: 'height must be even' }),
});

export type ProofClipEncodingParsed = z.infer<typeof proofClipEncodingSchema>;
