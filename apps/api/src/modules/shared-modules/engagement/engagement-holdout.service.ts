import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@product/db';
import { pickVariantId } from '../../../shared/utils/variant-assignment.js';
import { PRISMA } from '../database/prisma.tokens.js';
import { ENGAGEMENT_HOLDOUT_EXPERIMENT_KEY } from './constants/engagement-holdout.js';

export type EngagementHoldoutAssignment = {
  experimentKey: string;
  variantKey: string;
};

/**
 * Sticky 10/90 holdout for engagement changes. Assigns on first send so
 * Phase 2 deliveries are tagged; Phase 4 reads the variant before changing
 * budget or copy.
 */
@Injectable()
export class EngagementHoldoutService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async assignmentsFor(
    userIds: readonly string[],
  ): Promise<Map<string, EngagementHoldoutAssignment>> {
    const uniqueUserIds = [...new Set(userIds)];
    const result = new Map<string, EngagementHoldoutAssignment>();

    if (uniqueUserIds.length === 0) {
      return result;
    }

    const experiment = await this.prisma.experiment.findUnique({
      where: { key: ENGAGEMENT_HOLDOUT_EXPERIMENT_KEY },
      include: { variants: true },
    });

    if (!experiment || experiment.status !== 'running') {
      return result;
    }

    const now = new Date();
    if (experiment.startAt && experiment.startAt.getTime() > now.getTime()) {
      return result;
    }
    if (experiment.endAt && experiment.endAt.getTime() <= now.getTime()) {
      return result;
    }

    const existing = await this.prisma.experimentAssignment.findMany({
      where: {
        experimentId: experiment.id,
        userId: { in: uniqueUserIds },
      },
      include: { variant: true },
    });

    const assignedUserIds = new Set<string>();
    for (const row of existing) {
      assignedUserIds.add(row.userId);
      result.set(row.userId, {
        experimentKey: ENGAGEMENT_HOLDOUT_EXPERIMENT_KEY,
        variantKey: row.variant.key,
      });
    }

    const missing = uniqueUserIds.filter((userId) => !assignedUserIds.has(userId));
    for (const userId of missing) {
      const variantId = pickVariantId(userId, experiment.id, experiment.variants);
      if (!variantId) {
        continue;
      }

      const variant = experiment.variants.find((item) => item.id === variantId);
      if (!variant) {
        continue;
      }

      try {
        await this.prisma.experimentAssignment.create({
          data: {
            experimentId: experiment.id,
            variantId,
            userId,
          },
        });
      } catch {
        // Concurrent assign — unique (experimentId, userId) wins; read below.
        const raced = await this.prisma.experimentAssignment.findUnique({
          where: {
            experimentId_userId: {
              experimentId: experiment.id,
              userId,
            },
          },
          include: { variant: true },
        });
        if (raced) {
          result.set(userId, {
            experimentKey: ENGAGEMENT_HOLDOUT_EXPERIMENT_KEY,
            variantKey: raced.variant.key,
          });
        }
        continue;
      }

      result.set(userId, {
        experimentKey: ENGAGEMENT_HOLDOUT_EXPERIMENT_KEY,
        variantKey: variant.key,
      });
    }

    return result;
  }
}
