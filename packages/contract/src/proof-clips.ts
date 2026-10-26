import { oc } from '@orpc/contract';
import { z } from 'zod';
import { deviceMetricSchema } from './challenge-capture.js';
import { formatProofCode, isValidProofCode, normaliseProofCode } from './proof-code.js';

export {
  formatProofCode,
  isValidProofCode,
  mintProofCode,
  normaliseProofCode,
  proofCodeCheckCharacter,
  PROOF_CODE_ALPHABET,
  PROOF_CODE_BODY_LENGTH,
} from './proof-code.js';

import {
  PROOF_CLIP_MAX_BYTES,
  PROOF_CLIP_MAX_DURATION_SECONDS,
  PROOF_CLIP_POSTER_MAX_BYTES,
} from './proof-clip-limits.js';

export {
  PROOF_CLIP_GROUP_RETENTION_DAYS,
  PROOF_CLIP_HARD_RETENTION_DAYS,
  PROOF_CLIP_MAX_BYTES,
  PROOF_CLIP_MAX_DURATION_SECONDS,
  PROOF_CLIP_POSTER_MAX_BYTES,
  PROOF_CLIP_RESERVE_WINDOW_MINUTES,
  PROOF_CLIP_SIGNED_URL_TTL_SECONDS,
  PROOF_CLIP_SOLO_RETENTION_DAYS,
} from './proof-clip-limits.js';

export const proofClipStatusSchema = z.enum([
  'reserved',
  'recorded',
  'ready',
  'expired',
  'removed',
]);

export const proofClipVisibilitySchema = z.enum(['group', 'shared']);

export const proofClipReportReasonSchema = z.enum([
  'inappropriate',
  'spam',
  'harassment',
  'other',
]);

export const proofCodeSchema = z
  .string()
  .trim()
  .min(1)
  .max(16)
  .transform(normaliseProofCode)
  .refine(isValidProofCode, { message: 'Check the code' });

export const proofClipSha256Schema = z
  .string()
  .regex(/^[a-f0-9]{64}$/i, 'sha256 must be 64 hex characters')
  .transform((value) => value.toLowerCase());

export const proofClipContextSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('challenge'),
    userChallengeId: z.string().min(1),
  }),
  z.object({
    kind: z.literal('practice'),
    challengeId: z.string().min(1),
  }),
  z.object({
    kind: z.literal('match'),
    matchId: z.string().min(1),
  }),
]);

export const reserveProofClipInputSchema = z.object({
  context: proofClipContextSchema,
  metric: deviceMetricSchema,
});

export const reserveProofClipOutputSchema = z.object({
  clipId: z.string().min(1),
  code: z.string().min(1),
  /** Display form with hyphen, e.g. `7KQ4-M2XD`. */
  displayCode: z.string().min(1),
  reservedUntil: z.string().datetime(),
});

export const recordProofClipInputSchema = z.object({
  clipId: z.string().min(1),
  sha256: proofClipSha256Schema,
  byteSize: z.number().int().positive().max(PROOF_CLIP_MAX_BYTES),
  durationSeconds: z.number().int().positive().max(PROOF_CLIP_MAX_DURATION_SECONDS),
  count: z.number().int().nonnegative().max(200_000),
  matchAttemptId: z.string().min(1).optional(),
  /** Base64 App Attest assertion; optional until phase 5 hardens attestation. */
  attestation: z.string().min(1).max(16_384).optional(),
  /** Downsampled landmark track JSON (phase 5); omitted when unavailable. */
  skeletonTrack: z.string().min(1).max(200_000).optional(),
});

export const recordProofClipOutputSchema = z.object({
  clipId: z.string().min(1),
  status: z.literal('recorded'),
  attested: z.boolean(),
});

export const requestProofClipUploadInputSchema = z.object({
  clipId: z.string().min(1),
  videoByteSize: z.number().int().positive().max(PROOF_CLIP_MAX_BYTES),
  posterByteSize: z.number().int().positive().max(PROOF_CLIP_POSTER_MAX_BYTES).optional(),
  /** Lets the server refuse a group post before any bytes are uploaded. */
  visibility: proofClipVisibilitySchema.optional(),
});

export const presignedPutSchema = z.object({
  url: z.string().url(),
  headers: z.record(z.string()),
  key: z.string().min(1),
});

export const requestProofClipUploadOutputSchema = z.object({
  video: presignedPutSchema,
  poster: presignedPutSchema.nullable(),
});

export const completeProofClipUploadInputSchema = z.object({
  clipId: z.string().min(1),
  visibility: proofClipVisibilitySchema,
});

export const completeProofClipUploadOutputSchema = z.object({
  clipId: z.string().min(1),
  status: z.literal('ready'),
  expiresAt: z.string().datetime(),
});

export const proofClipSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(1),
  displayCode: z.string().min(1),
  status: proofClipStatusSchema,
  metric: deviceMetricSchema,
  count: z.number().int().nonnegative(),
  durationSeconds: z.number().int().nonnegative().nullable(),
  matchId: z.string().min(1).nullable(),
  userChallengeId: z.string().min(1).nullable(),
  recordedAt: z.string().datetime().nullable(),
  sharedAt: z.string().datetime().nullable(),
  expiresAt: z.string().datetime().nullable(),
  attested: z.boolean(),
  /** Short-lived signed URL; null when the object has expired or was removed. */
  videoUrl: z.string().url().nullable(),
  posterUrl: z.string().url().nullable(),
  isOwner: z.boolean(),
});

export const getProofClipInputSchema = z.object({
  clipId: z.string().min(1),
});

export const listMatchProofClipsInputSchema = z.object({
  matchId: z.string().min(1),
  /** Contest local day `YYYY-MM-DD`. Defaults to today in the match zone. */
  dayKey: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const listMatchProofClipsOutputSchema = z.object({
  clips: z.array(
    proofClipSchema.extend({
      userId: z.string().min(1),
      displayName: z.string().min(1),
    }),
  ),
});

export const verifyProofCodeInputSchema = z.object({
  code: proofCodeSchema,
});

export const verifyProofCodeOutputSchema = z.discriminatedUnion('outcome', [
  z.object({
    outcome: z.literal('verified'),
    metric: deviceMetricSchema,
    count: z.number().int().nonnegative(),
    recordedAt: z.string().datetime(),
    attested: z.boolean(),
    videoUrl: z.string().url().nullable(),
    posterUrl: z.string().url().nullable(),
  }),
  z.object({
    outcome: z.literal('original_expired'),
    metric: deviceMetricSchema,
    count: z.number().int().nonnegative(),
    recordedAt: z.string().datetime(),
    attested: z.boolean(),
  }),
  z.object({
    outcome: z.literal('removed'),
  }),
  z.object({
    outcome: z.literal('not_shared'),
  }),
  z.object({
    outcome: z.literal('not_found'),
  }),
]);

export const removeProofClipInputSchema = z.object({
  clipId: z.string().min(1),
});

export const reportProofClipInputSchema = z.object({
  clipId: z.string().min(1),
  reason: proofClipReportReasonSchema,
});

export const blockUserInputSchema = z.object({
  userId: z.string().min(1),
});

export const okOutputSchema = z.object({ ok: z.literal(true) });

export const reserveProofClipContract = oc
  .route({ method: 'POST', path: '/proof-clips/reserve' })
  .input(reserveProofClipInputSchema)
  .output(reserveProofClipOutputSchema);

export const recordProofClipContract = oc
  .route({ method: 'POST', path: '/proof-clips/record' })
  .input(recordProofClipInputSchema)
  .output(recordProofClipOutputSchema);

export const requestProofClipUploadContract = oc
  .route({ method: 'POST', path: '/proof-clips/upload-url' })
  .input(requestProofClipUploadInputSchema)
  .output(requestProofClipUploadOutputSchema);

export const completeProofClipUploadContract = oc
  .route({ method: 'POST', path: '/proof-clips/complete' })
  .input(completeProofClipUploadInputSchema)
  .output(completeProofClipUploadOutputSchema);

export const getProofClipContract = oc
  .route({ method: 'GET', path: '/proof-clips/{clipId}' })
  .input(getProofClipInputSchema)
  .output(proofClipSchema);

export const listMatchProofClipsContract = oc
  .route({ method: 'GET', path: '/proof-clips/match/{matchId}' })
  .input(listMatchProofClipsInputSchema)
  .output(listMatchProofClipsOutputSchema);

export const verifyProofCodeContract = oc
  .route({ method: 'POST', path: '/proof-clips/verify' })
  .input(verifyProofCodeInputSchema)
  .output(verifyProofCodeOutputSchema);

/** Anonymous verify for shared clips. Website callers use this without a session. */
export const publicVerifyProofCodeContract = oc
  .route({ method: 'GET', path: '/proof-clips/verify/public' })
  .input(verifyProofCodeInputSchema)
  .output(verifyProofCodeOutputSchema);

export const removeProofClipContract = oc
  .route({ method: 'POST', path: '/proof-clips/remove' })
  .input(removeProofClipInputSchema)
  .output(okOutputSchema);

export const reportProofClipContract = oc
  .route({ method: 'POST', path: '/proof-clips/report' })
  .input(reportProofClipInputSchema)
  .output(okOutputSchema);

export const blockUserContract = oc
  .route({ method: 'POST', path: '/blocks' })
  .input(blockUserInputSchema)
  .output(okOutputSchema);

export const unblockUserContract = oc
  .route({ method: 'POST', path: '/blocks/remove' })
  .input(blockUserInputSchema)
  .output(okOutputSchema);

export function toDisplayProofCode(code: string): string {
  return formatProofCode(code);
}

export type ProofClipStatus = z.infer<typeof proofClipStatusSchema>;
export type ProofClipVisibility = z.infer<typeof proofClipVisibilitySchema>;
export type ProofClipReportReason = z.infer<typeof proofClipReportReasonSchema>;
export type ProofClip = z.infer<typeof proofClipSchema>;
export type ReserveProofClipInput = z.infer<typeof reserveProofClipInputSchema>;
export type RecordProofClipInput = z.infer<typeof recordProofClipInputSchema>;
export type VerifyProofCodeOutput = z.infer<typeof verifyProofCodeOutputSchema>;
