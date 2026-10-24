import { Inject, Injectable } from '@nestjs/common';
import type {
  ExperimentAssignment as ExperimentAssignmentDto,
  ExperimentKey,
} from '@product/contract';
import { experimentKeySchema } from '@product/contract';
import type { Prisma, PrismaClient } from '@product/db';
import {
  type AuthenticatedUser,
  requireUser,
} from '../../../shared/types/authenticated-user.js';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import { pickVariantId } from '../../../shared/utils/variant-assignment.js';

function configurationAsRecord(
  value: Prisma.JsonValue | null,
): Record<string, unknown> | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

@Injectable()
export class ExperimentsService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async getOrAssign(
    currentUser: AuthenticatedUser | null | undefined,
    experimentKey: ExperimentKey,
  ): Promise<ExperimentAssignmentDto | null> {
    const user = requireUser(currentUser);
    const now = new Date();

    const experiment = await this.prisma.experiment.findUnique({
      where: { key: experimentKey },
      include: { variants: true },
    });

    if (!experiment || experiment.status !== 'running') {
      return null;
    }

    if (experiment.startAt && experiment.startAt.getTime() > now.getTime()) {
      return null;
    }

    if (experiment.endAt && experiment.endAt.getTime() <= now.getTime()) {
      return null;
    }

    const existing = await this.prisma.experimentAssignment.findUnique({
      where: {
        experimentId_userId: {
          experimentId: experiment.id,
          userId: user.id,
        },
      },
      include: { variant: true, experiment: true },
    });

    if (existing) {
      return this.toAssignment(existing);
    }

    const variantId = pickVariantId(user.id, experiment.id, experiment.variants);
    if (!variantId) {
      return null;
    }

    try {
      const created = await this.prisma.experimentAssignment.create({
        data: {
          experimentId: experiment.id,
          variantId,
          userId: user.id,
        },
        include: { variant: true, experiment: true },
      });

      return this.toAssignment(created);
    } catch {
      // Concurrent first assign — unique (experimentId, userId) wins.
      const raced = await this.prisma.experimentAssignment.findUnique({
        where: {
          experimentId_userId: {
            experimentId: experiment.id,
            userId: user.id,
          },
        },
        include: { variant: true, experiment: true },
      });

      return raced ? this.toAssignment(raced) : null;
    }
  }

  private toAssignment(row: {
    experimentId: string;
    variantId: string;
    assignedAt: Date;
    experiment: { key: string };
    variant: {
      key: string;
      configuration: Prisma.JsonValue | null;
    };
  }): ExperimentAssignmentDto | null {
    const parsedKey = experimentKeySchema.safeParse(row.experiment.key);
    if (!parsedKey.success) {
      return null;
    }

    return {
      experimentId: row.experimentId,
      experimentKey: parsedKey.data,
      variantId: row.variantId,
      variantKey: row.variant.key,
      configuration: configurationAsRecord(row.variant.configuration),
      assignedAt: row.assignedAt.toISOString(),
    };
  }
}
