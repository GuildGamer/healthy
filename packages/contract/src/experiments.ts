import { oc } from '@orpc/contract';
import { z } from 'zod';

export const EXPERIMENT_KEYS = [
  'challenge_referral_v1',
  'engagement_holdout_v1',
] as const;

export const experimentKeySchema = z.enum(EXPERIMENT_KEYS);

export const experimentStatusSchema = z.enum(['draft', 'running', 'ended']);

export const experimentVariantKeySchema = z.string().min(1).max(64);

export const experimentAssignmentSchema = z.object({
  experimentId: z.string().min(1),
  experimentKey: experimentKeySchema,
  variantId: z.string().min(1),
  variantKey: experimentVariantKeySchema,
  configuration: z.record(z.string(), z.unknown()).nullable(),
  assignedAt: z.string().datetime(),
});

export const getExperimentAssignmentInputSchema = z.object({
  experimentKey: experimentKeySchema,
});

export const getExperimentAssignmentContract = oc
  .route({ method: 'POST', path: '/experiments/assign' })
  .input(getExperimentAssignmentInputSchema)
  .output(experimentAssignmentSchema.nullable());

export type ExperimentKey = z.infer<typeof experimentKeySchema>;
export type ExperimentStatus = z.infer<typeof experimentStatusSchema>;
export type ExperimentAssignment = z.infer<typeof experimentAssignmentSchema>;
