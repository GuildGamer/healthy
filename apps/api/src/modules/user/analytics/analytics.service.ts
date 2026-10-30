import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import {
  ANALYTICS_EVENT_PROPERTIES,
  type AnalyticsEventName,
  type TrackAnalyticsEventInput,
} from '@product/contract';
import type { Prisma, PrismaClient } from '@product/db';
import type { AuthenticatedUser } from '../../../shared/types/authenticated-user.js';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import { EngagementDeliveryService } from '../../shared-modules/engagement/index.js';
import type { TrackAnalyticsEventInputDto } from './dto/analytics.dto.js';

const OCCURRED_AT_SKEW_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Optional() private readonly engagementDelivery?: EngagementDeliveryService,
  ) {}

  async track(
    currentUser: AuthenticatedUser | null | undefined,
    input: TrackAnalyticsEventInputDto,
  ): Promise<{ ok: true }> {
    this.softValidateProperties(input.name, input.properties);
    const occurredAt = this.clampOccurredAt(input.occurredAt);

    await this.prisma.analyticsEvent.create({
      data: this.toCreateData(currentUser?.id ?? null, input, occurredAt),
    });

    await this.runSideEffects(input);
    return { ok: true };
  }

  async trackBatch(
    currentUser: AuthenticatedUser | null | undefined,
    events: readonly TrackAnalyticsEventInputDto[],
  ): Promise<{ ok: true }> {
    if (events.length === 0) {
      return { ok: true };
    }

    const userId = currentUser?.id ?? null;
    const rows = events.map((input) => {
      this.softValidateProperties(input.name, input.properties);
      return this.toCreateData(
        userId,
        input,
        this.clampOccurredAt(input.occurredAt),
      );
    });

    await this.prisma.analyticsEvent.createMany({ data: rows });

    for (const input of events) {
      await this.runSideEffects(input);
    }

    return { ok: true };
  }

  private toCreateData(
    userId: string | null,
    input: TrackAnalyticsEventInput,
    occurredAt: Date,
  ): Prisma.AnalyticsEventCreateManyInput {
    return {
      name: input.name,
      userId,
      anonymousId: input.anonymousId ?? null,
      properties: input.properties as Prisma.InputJsonValue,
      sessionId: input.context?.sessionId ?? null,
      platform: input.context?.platform ?? null,
      appVersion: input.context?.appVersion ?? null,
      emitter: input.context?.emitter ?? null,
      occurredAt,
    };
  }

  private clampOccurredAt(occurredAtIso: string | undefined): Date {
    const now = Date.now();
    if (!occurredAtIso) {
      return new Date(now);
    }

    const parsed = new Date(occurredAtIso).getTime();
    if (Number.isNaN(parsed)) {
      return new Date(now);
    }

    const min = now - OCCURRED_AT_SKEW_MS;
    const max = now + OCCURRED_AT_SKEW_MS;
    return new Date(Math.min(max, Math.max(min, parsed)));
  }

  private softValidateProperties(
    name: AnalyticsEventName,
    properties: Record<string, unknown>,
  ): void {
    const schema = ANALYTICS_EVENT_PROPERTIES[name];
    if (!schema) {
      return;
    }

    const result = schema.safeParse(properties);
    if (!result.success) {
      this.logger.warn(
        `Analytics properties mismatch for ${name}: ${result.error.message}`,
      );
    }
  }

  private async runSideEffects(
    input: TrackAnalyticsEventInput,
  ): Promise<void> {
    if (input.name === 'push_opened') {
      await this.markPushOpened(input.properties);
    }

    if (input.name === 'challenge_link_opened') {
      await this.markInviteOpened(input.properties);
    }
  }

  private async markPushOpened(
    properties: Record<string, unknown>,
  ): Promise<void> {
    if (!this.engagementDelivery) {
      return;
    }

    const deliveryId = properties.engagementDeliveryId;
    if (typeof deliveryId !== 'string' || deliveryId.length === 0) {
      return;
    }

    await this.engagementDelivery.markOpened(deliveryId);
  }

  private async markInviteOpened(
    properties: Record<string, unknown>,
  ): Promise<void> {
    const inviteToken = properties.inviteToken;
    if (typeof inviteToken !== 'string' || inviteToken.length === 0) {
      return;
    }

    try {
      await this.prisma.match.updateMany({
        where: { inviteToken, firstOpenedAt: null },
        data: { firstOpenedAt: new Date() },
      });
    } catch (error) {
      this.logger.error(
        `Could not stamp firstOpenedAt for invite ${inviteToken}`,
        error,
      );
    }
  }
}
