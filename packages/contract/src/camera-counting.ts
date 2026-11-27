import { oc } from '@orpc/contract';
import { z } from 'zod';

/**
 * Lifetime free camera-counting starts for non-members. Members are unlimited
 * (`freeCameraStartsRemaining` is null).
 */
export const FREE_CAMERA_COUNTING_STARTS = 2;

export const cameraCountingContextSchema = z.enum(['challenge', 'practice', 'match']);

/**
 * Records that counting has begun. Idempotent on `clientStartId` so a retry
 * after a flaky network does not burn a second free start. Walks never call
 * this; only pose (camera) sessions do.
 */
export const startCameraCountingInputSchema = z.discriminatedUnion('context', [
  z.object({
    context: z.literal('challenge'),
    clientStartId: z.string().min(1).max(128),
    userChallengeId: z.string().min(1),
  }),
  z.object({
    context: z.literal('practice'),
    clientStartId: z.string().min(1).max(128),
    challengeId: z.string().min(1),
  }),
  z.object({
    context: z.literal('match'),
    clientStartId: z.string().min(1).max(128),
    matchId: z.string().min(1),
  }),
]);

export const startCameraCountingOutputSchema = z.object({
  /**
   * Remaining free starts after this call. Null when the caller has membership
   * (unlimited). Zero means this was the last free start.
   */
  freeCameraStartsRemaining: z.number().int().nonnegative().nullable(),
});

export const startCameraCountingContract = oc
  .route({ method: 'POST', path: '/camera-counting/start' })
  .input(startCameraCountingInputSchema)
  .output(startCameraCountingOutputSchema);

export type CameraCountingContext = z.infer<typeof cameraCountingContextSchema>;
export type StartCameraCountingInput = z.infer<typeof startCameraCountingInputSchema>;
export type StartCameraCountingOutput = z.infer<typeof startCameraCountingOutputSchema>;
