import { Inject, Injectable } from '@nestjs/common';
import { ORPCError } from '@orpc/server';
import {
  experimentKeySchema,
  experimentStatusSchema,
  type AdminExperimentDetail,
  type AdminExperimentListItem,
  type UpdateAdminExperimentWeightsInput,
} from '@product/contract';
import type { PrismaClient } from '@product/db';
import {
  type AuthenticatedAdmin,
  requireAdmin,
} from '../../../shared/types/authenticated-admin.js';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';

/**
 * Funnel rates for the challenge-referral experiment:
 * - challengeSendRate (H1) = invites created / assigned
 * - inviteAcceptRate (H2) = accepted / invites created
 * - activatedFriendRate (H3) = recipients who completed / invites created
 * - secondGenerationRate = child matches / invites created
 */
@Injectable()
export class AdminExperimentsService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async list(
    currentAdmin: AuthenticatedAdmin | null | undefined,
  ): Promise<{ experiments: AdminExperimentListItem[] }> {
    requireAdmin(currentAdmin);

    const rows = await this.prisma.experiment.findMany({
      include: {
        _count: { select: { assignments: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const experiments: AdminExperimentListItem[] = [];
    for (const row of rows) {
      const key = experimentKeySchema.safeParse(row.key);
      const status = experimentStatusSchema.safeParse(row.status);
      if (!key.success || !status.success) {
        continue;
      }

      experiments.push({
        id: row.id,
        key: key.data,
        name: row.name,
        status: status.data,
        primaryMetric: row.primaryMetric,
        participantCount: row._count.assignments,
        startAt: row.startAt?.toISOString() ?? null,
        endAt: row.endAt?.toISOString() ?? null,
      });
    }

    return { experiments };
  }

  async get(
    currentAdmin: AuthenticatedAdmin | null | undefined,
    id: string,
  ): Promise<AdminExperimentDetail> {
    requireAdmin(currentAdmin);
    return this.buildDetail(id);
  }

  async updateWeights(
    currentAdmin: AuthenticatedAdmin | null | undefined,
    input: UpdateAdminExperimentWeightsInput,
  ): Promise<AdminExperimentDetail> {
    requireAdmin(currentAdmin);

    const experiment = await this.prisma.experiment.findUnique({
      where: { id: input.id },
      include: { variants: true },
    });

    if (!experiment) {
      throw new ORPCError('NOT_FOUND', {
        message: 'That experiment was not found.',
      });
    }

    const knownKeys = new Set(experiment.variants.map((variant) => variant.key));
    for (const row of input.variants) {
      if (!knownKeys.has(row.variantKey)) {
        throw new ORPCError('BAD_REQUEST', {
          message: `Unknown variant key: ${row.variantKey}`,
        });
      }
    }

    const totalWeight = input.variants.reduce(
      (sum, row) => sum + row.weight,
      0,
    );
    if (totalWeight <= 0) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'At least one variant needs a positive weight.',
      });
    }

    await this.prisma.$transaction(
      input.variants.map((row) =>
        this.prisma.experimentVariant.update({
          where: {
            experimentId_key: {
              experimentId: experiment.id,
              key: row.variantKey,
            },
          },
          data: { weight: row.weight },
        }),
      ),
    );

    return this.buildDetail(experiment.id);
  }

  private async buildDetail(id: string): Promise<AdminExperimentDetail> {
    const experiment = await this.prisma.experiment.findUnique({
      where: { id },
      include: {
        variants: {
          include: { _count: { select: { assignments: true } } },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { assignments: true } },
      },
    });

    if (!experiment) {
      throw new ORPCError('NOT_FOUND', {
        message: 'That experiment was not found.',
      });
    }

    const key = experimentKeySchema.safeParse(experiment.key);
    const status = experimentStatusSchema.safeParse(experiment.status);
    if (!key.success || !status.success) {
      throw new ORPCError('NOT_FOUND', {
        message: 'That experiment was not found.',
      });
    }

    const variants = await Promise.all(
      experiment.variants.map(async (variant) => {
        const funnel = await this.funnelForVariant(
          experiment.id,
          variant.key,
          variant._count.assignments,
        );
        const assigned =
          funnel.find((step) => step.key === 'assigned')?.count ?? 0;
        const invitesCreated =
          funnel.find((step) => step.key === 'challenge_created')?.count ?? 0;
        const accepted =
          funnel.find((step) => step.key === 'challenge_accepted')?.count ?? 0;
        const recipientsCompleted =
          funnel.find((step) => step.key === 'challenge_completed_by_recipient')
            ?.count ?? 0;
        const secondGeneration =
          funnel.find((step) => step.key === 'second_generation')?.count ?? 0;

        return {
          variantKey: variant.key,
          variantName: variant.name,
          weight: variant.weight,
          assignedCount: variant._count.assignments,
          funnel,
          challengeSendRate: rate(invitesCreated, assigned),
          inviteAcceptRate: rate(accepted, invitesCreated),
          activatedFriendRate: rate(recipientsCompleted, invitesCreated),
          secondGenerationRate: rate(secondGeneration, invitesCreated),
        };
      }),
    );

    return {
      id: experiment.id,
      key: key.data,
      name: experiment.name,
      description: experiment.description,
      status: status.data,
      primaryMetric: experiment.primaryMetric,
      startAt: experiment.startAt?.toISOString() ?? null,
      endAt: experiment.endAt?.toISOString() ?? null,
      participantCount: experiment._count.assignments,
      stageHint: stageHintFor(variants.map((variant) => variant.weight)),
      variants,
    };
  }

  private async funnelForVariant(
    experimentId: string,
    variantKey: string,
    assignedCount: number,
  ) {
    const matches = await this.prisma.match.findMany({
      where: { experimentId, experimentVariantKey: variantKey },
      select: {
        id: true,
        hostUserId: true,
        firstOpenedAt: true,
        parentMatchId: true,
        participants: { select: { userId: true } },
        attempts: { select: { userId: true } },
        _count: { select: { childMatches: true } },
      },
    });

    const [
      challengeCompletedEvents,
      challengeCreatedEvents,
      linkOpenedEvents,
      acceptedEvents,
      recipientCompletedEvents,
    ] = await Promise.all([
      this.countEvents('challenge_completed', experimentId, variantKey),
      this.countEvents('challenge_created', experimentId, variantKey),
      this.countEvents('challenge_link_opened', experimentId, variantKey),
      this.countEvents('challenge_accepted', experimentId, variantKey),
      this.countEvents(
        'challenge_completed_by_recipient',
        experimentId,
        variantKey,
      ),
    ]);

    // Match rows stamped with experiment+variant are authoritative for sends.
    // Events may double-count when both client and server emit.
    const invitesCreated =
      matches.length > 0 ? matches.length : challengeCreatedEvents;
    const linkOpened = Math.max(
      matches.filter((match) => match.firstOpenedAt !== null).length,
      linkOpenedEvents,
    );
    const accepted = Math.max(
      matches.filter((match) =>
        match.participants.some((row) => row.userId !== match.hostUserId),
      ).length,
      acceptedEvents,
    );
    const recipientCompleted = Math.max(
      matches.filter((match) =>
        match.attempts.some((attempt) => attempt.userId !== match.hostUserId),
      ).length,
      recipientCompletedEvents,
    );
    const secondGeneration = matches.filter(
      (match) => match._count.childMatches > 0,
    ).length;

    // Prefer assignment count for the top of funnel; fall back to completion events.
    const assigned = Math.max(assignedCount, challengeCompletedEvents);

    return [
      {
        key: 'assigned',
        label: 'Assigned / challenge completed',
        count: assigned,
      },
      {
        key: 'challenge_created',
        label: 'Challenge created (H1 send)',
        count: invitesCreated,
      },
      {
        key: 'challenge_link_opened',
        label: 'Link opened',
        count: linkOpened,
      },
      {
        key: 'challenge_accepted',
        label: 'Accepted / joined (H2)',
        count: accepted,
      },
      {
        key: 'challenge_completed_by_recipient',
        label: 'Completed by recipient (H3)',
        count: recipientCompleted,
      },
      {
        key: 'second_generation',
        label: 'Second-generation challenge',
        count: secondGeneration,
      },
    ];
  }

  private async countEvents(
    name: string,
    experimentId: string,
    variantKey: string,
  ): Promise<number> {
    // Properties are JSON; filter in application when the volume is small.
    // Index on name keeps this bounded for early experiment traffic.
    const rows = await this.prisma.analyticsEvent.findMany({
      where: { name },
      select: { properties: true },
    });

    return rows.filter((row) =>
      propertiesMatchExperiment(row.properties, experimentId, variantKey),
    ).length;
  }
}

function propertiesMatchExperiment(
  properties: unknown,
  experimentId: string,
  variantKey: string,
): boolean {
  if (
    properties === null ||
    typeof properties !== 'object' ||
    Array.isArray(properties)
  ) {
    return false;
  }

  const record = properties as Record<string, unknown>;
  const eventExperimentId = record.experimentId ?? record.experiment_id;
  const eventVariant =
    record.experimentVariantKey ??
    record.experiment_variant_key ??
    record.experiment_variant;

  return (
    eventExperimentId === experimentId && eventVariant === variantKey
  );
}

function rate(numerator: number, denominator: number): number | null {
  if (denominator <= 0) {
    return null;
  }

  return numerator / denominator;
}

function stageHintFor(weights: readonly number[]): string {
  const positive = weights.filter((weight) => weight > 0);
  if (positive.length <= 1) {
    return 'Stage 1 (qualitative): ~100% treatment. Watch H1 send rate, H2 join rate, and H3 activated-friend / 2nd-gen among ~20–30 users. Flip to Stage 2 50/50 only when ready.';
  }

  const equal =
    positive.length >= 2 && positive.every((weight) => weight === positive[0]);
  if (equal) {
    return 'Stage 2 (A/B): equal positive weights. Compare funnel rates by variant. Walking / other wedges share invite restore; CTA experiment stays push-up scoped.';
  }

  return 'Custom weights. New assignments follow these weights; existing assignments stay sticky.';
}
