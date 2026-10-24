import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Prisma, PrismaClient } from '@product/db';
import { PRISMA } from '../database/prisma.tokens.js';
import {
  PUSH_SENDER,
  PushDevicesService,
  type PushMessage,
  type PushSender,
} from '../push/index.js';
import { EngagementHoldoutService } from './engagement-holdout.service.js';
import type { EngagementSource } from './enums/engagement-source.js';
import {
  CADENCE_ENGAGEMENT_SOURCES,
  HABITS_PUSH_CHANNEL_ID,
  HABITS_PUSH_THREAD_ID,
} from './policy/constants.js';
import type {
  EngagementPush,
  EngagementSendInput,
  EngagementSendResult,
} from './types/engagement-push.js';

type PreparedDelivery = {
  id: string;
  push: EngagementPush;
  data: Record<string, string>;
  experimentKey: string | null;
  variantKey: string | null;
};

const CADENCE_SOURCE_SET = new Set<string>(CADENCE_ENGAGEMENT_SOURCES);

function isCadenceSource(source: EngagementSource): boolean {
  return CADENCE_SOURCE_SET.has(source);
}

/**
 * The single place that talks to the push provider. Callers own inbox rows and
 * idempotency; this service owns device lookup, send, token retirement, and
 * the first-party delivery log.
 */
@Injectable()
export class EngagementDeliveryService {
  private readonly logger = new Logger(EngagementDeliveryService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(PUSH_SENDER) private readonly pushSender: PushSender,
    private readonly pushDevices: PushDevicesService,
    private readonly holdout: EngagementHoldoutService,
  ) {}

  async send(input: EngagementSendInput): Promise<EngagementSendResult> {
    if (input.pushes.length === 0) {
      return emptyResult();
    }

    const userIds = [...new Set(input.pushes.map((push) => push.userId))];
    const devices =
      input.audience === 'group_opt_in'
        ? await this.pushDevices.groupPushDevicesFor(userIds)
        : await this.pushDevices.activeDevicesFor(userIds);

    const tokensByUserId = new Map<string, string[]>();
    for (const device of devices) {
      const tokens = tokensByUserId.get(device.userId) ?? [];
      tokens.push(device.expoPushToken);
      tokensByUserId.set(device.userId, tokens);
    }

    const usersWithDevice: string[] = [];
    const usersWithoutDevice: string[] = [];
    for (const userId of userIds) {
      if ((tokensByUserId.get(userId) ?? []).length > 0) {
        usersWithDevice.push(userId);
      } else {
        usersWithoutDevice.push(userId);
      }
    }

    const holdoutByUser = await this.holdout.assignmentsFor(usersWithDevice);
    const prepared: PreparedDelivery[] = [];

    for (const push of input.pushes) {
      const tokens = tokensByUserId.get(push.userId) ?? [];
      if (tokens.length === 0) {
        continue;
      }

      const id = randomUUID();
      const holdout = holdoutByUser.get(push.userId);
      const data = {
        ...push.data,
        engagementDeliveryId: id,
      };

      prepared.push({
        id,
        push,
        data,
        experimentKey: push.experimentKey ?? holdout?.experimentKey ?? null,
        variantKey: push.variantKey ?? holdout?.variantKey ?? null,
      });
    }

    const messages = this.buildMessages(input.source, prepared, tokensByUserId);
    if (messages.length === 0) {
      return {
        sentCount: 0,
        messageCount: 0,
        usersWithDevice,
        usersWithoutDevice,
        deliveryIdsByUserId: {},
      };
    }

    const result = await this.pushSender.send(messages);
    await this.pushDevices.deactivateTokens(result.rejectedTokens);

    this.logger.log(
      `${input.source} push sent ${result.sentCount} of ${messages.length} messages`,
    );

    const deliveryIdsByUserId: Record<string, string> = {};
    for (const item of prepared) {
      deliveryIdsByUserId[item.push.userId] = item.id;
    }

    if (result.sentCount > 0) {
      await this.recordDeliveries(input, prepared);
    }

    return {
      sentCount: result.sentCount,
      messageCount: messages.length,
      usersWithDevice,
      usersWithoutDevice,
      deliveryIdsByUserId,
    };
  }

  /** First open wins; later taps are no-ops. */
  async markOpened(deliveryId: string): Promise<void> {
    await this.prisma.engagementDelivery.updateMany({
      where: { id: deliveryId, openedAt: null },
      data: { openedAt: new Date() },
    });
  }

  private buildMessages(
    source: EngagementSource,
    prepared: readonly PreparedDelivery[],
    tokensByUserId: Map<string, string[]>,
  ): PushMessage[] {
    const messages: PushMessage[] = [];
    const thread =
      isCadenceSource(source)
        ? {
            threadId: HABITS_PUSH_THREAD_ID,
            channelId: HABITS_PUSH_CHANNEL_ID,
          }
        : {};

    for (const item of prepared) {
      const tokens = tokensByUserId.get(item.push.userId) ?? [];
      for (const expoPushToken of tokens) {
        messages.push({
          expoPushToken,
          title: item.push.title,
          body: item.push.body,
          data: item.data,
          ...thread,
        });
      }
    }

    return messages;
  }

  private async recordDeliveries(
    input: EngagementSendInput,
    prepared: readonly PreparedDelivery[],
  ): Promise<void> {
    const sentAt = new Date();

    await this.prisma.engagementDelivery.createMany({
      data: prepared.map((item) => ({
        id: item.id,
        userId: item.push.userId,
        source: input.source,
        audience: input.audience,
        title: item.push.title,
        body: item.push.body,
        templateKey: item.push.templateKey ?? input.source,
        situation: item.push.situation ?? null,
        copyVersion: item.push.copyVersion ?? 'v1',
        experimentKey: item.experimentKey,
        variantKey: item.variantKey,
        leadChallengeId:
          item.push.leadChallengeId ?? item.push.data.challengeId ?? null,
        notificationId: item.push.notificationId ?? null,
        payload: item.data as Prisma.InputJsonValue,
        sentAt,
      })),
      skipDuplicates: true,
    });
  }
}

function emptyResult(): EngagementSendResult {
  return {
    sentCount: 0,
    messageCount: 0,
    usersWithDevice: [],
    usersWithoutDevice: [],
    deliveryIdsByUserId: {},
  };
}
