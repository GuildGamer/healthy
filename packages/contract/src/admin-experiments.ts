import { oc } from '@orpc/contract';
import { z } from 'zod';
import {
  experimentKeySchema,
  experimentStatusSchema,
} from './experiments.js';

export const adminExperimentListItemSchema = z.object({
  id: z.string().min(1),
  key: experimentKeySchema,
  name: z.string().min(1),
  status: experimentStatusSchema,
  primaryMetric: z.string().min(1),
  participantCount: z.number().int().nonnegative(),
  startAt: z.string().datetime().nullable(),
  endAt: z.string().datetime().nullable(),
});

export const adminExperimentFunnelStepSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  count: z.number().int().nonnegative(),
});

export const adminExperimentVariantStatsSchema = z.object({
  variantKey: z.string().min(1),
  variantName: z.string().min(1),
  weight: z.number().int().nonnegative(),
  assignedCount: z.number().int().nonnegative(),
  funnel: z.array(adminExperimentFunnelStepSchema),
  /** H1: challenge created / assigned (send rate after completion). */
  challengeSendRate: z.number().min(0).max(1).nullable(),
  /** H2: accepted / invites created (invite → join). */
  inviteAcceptRate: z.number().min(0).max(1).nullable(),
  /** H3: recipients who completed / invites created. */
  activatedFriendRate: z.number().min(0).max(1).nullable(),
  /** Child matches / invites created (re-challenge / 2nd gen). */
  secondGenerationRate: z.number().min(0).max(1).nullable(),
});

export const adminExperimentDetailSchema = z.object({
  id: z.string().min(1),
  key: experimentKeySchema,
  name: z.string().min(1),
  description: z.string(),
  status: experimentStatusSchema,
  primaryMetric: z.string().min(1),
  startAt: z.string().datetime().nullable(),
  endAt: z.string().datetime().nullable(),
  participantCount: z.number().int().nonnegative(),
  /**
   * Ops hint for the current stage. Stage 1 = qualitative 100% treatment;
   * Stage 2 = equal weights via updateExperimentWeights — never auto-flipped.
   */
  stageHint: z.string().min(1),
  variants: z.array(adminExperimentVariantStatsSchema),
});

export const listAdminExperimentsContract = oc
  .route({ method: 'GET', path: '/admin/experiments' })
  .output(z.object({ experiments: z.array(adminExperimentListItemSchema) }));

export const getAdminExperimentInputSchema = z.object({
  id: z.string().min(1),
});

export const getAdminExperimentContract = oc
  .route({ method: 'GET', path: '/admin/experiments/detail' })
  .input(getAdminExperimentInputSchema)
  .output(adminExperimentDetailSchema);

export const updateAdminExperimentWeightsInputSchema = z.object({
  id: z.string().min(1),
  variants: z
    .array(
      z.object({
        variantKey: z.string().min(1).max(64),
        weight: z.number().int().nonnegative().max(10_000),
      }),
    )
    .min(1)
    .max(16),
});

export const updateAdminExperimentWeightsContract = oc
  .route({ method: 'POST', path: '/admin/experiments/weights' })
  .input(updateAdminExperimentWeightsInputSchema)
  .output(adminExperimentDetailSchema);

export type AdminExperimentListItem = z.infer<
  typeof adminExperimentListItemSchema
>;
export type AdminExperimentDetail = z.infer<typeof adminExperimentDetailSchema>;
export type UpdateAdminExperimentWeightsInput = z.infer<
  typeof updateAdminExperimentWeightsInputSchema
>;
