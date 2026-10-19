import { Inject, Injectable } from '@nestjs/common';
import type { Prisma, PrismaClient } from '@product/db';
import type { AuthenticatedUser } from '../../../shared/types/authenticated-user.js';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import type { TrackAnalyticsEventInputDto } from './dto/analytics.dto.js';

@Injectable()
export class AnalyticsService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async track(
    currentUser: AuthenticatedUser | null | undefined,
    input: TrackAnalyticsEventInputDto,
  ): Promise<{ ok: true }> {
    const occurredAt = input.occurredAt
      ? new Date(input.occurredAt)
      : new Date();

    await this.prisma.analyticsEvent.create({
      data: {
        name: input.name,
        userId: currentUser?.id ?? null,
        anonymousId: input.anonymousId ?? null,
        properties: input.properties as Prisma.InputJsonValue,
        occurredAt,
      },
    });

    return { ok: true };
  }
}
