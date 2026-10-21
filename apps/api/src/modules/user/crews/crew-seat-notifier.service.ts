import { Inject, Injectable, Logger } from '@nestjs/common';
import type { PrismaClient } from '@product/db';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import { PushDevicesService } from '../../shared-modules/push/push-devices.service.js';
import type { PushMessage, PushSender } from '../../shared-modules/push/push-sender.js';
import { PUSH_SENDER } from '../../shared-modules/push/push-sender.js';
import {
  CREW_SEAT_PUSH_BODY,
  CREW_SEAT_PUSH_TITLE,
} from './constants/crew-seat-notification.js';

/**
 * The one push a crew-seated member gets. Exactly one: being added to someone
 * else's contest is not a licence to keep nudging them, and they are not
 * nudged again until they accept.
 */
@Injectable()
export class CrewSeatNotifierService {
  private readonly logger = new Logger(CrewSeatNotifierService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(PUSH_SENDER) private readonly pushSender: PushSender,
    private readonly pushDevices: PushDevicesService,
  ) {}

  /**
   * Idempotent: the inbox row is keyed on the seat, so a retried creation
   * cannot notify the same person about the same contest twice.
   */
  async notifySeated(matchId: string, userIds: readonly string[]): Promise<void> {
    if (userIds.length === 0) {
      return;
    }

    const unnotified = await this.excludeAlreadyNotified(matchId, userIds);

    if (unnotified.length === 0) {
      return;
    }

    // The inbox row is written first and is the idempotency record. A push
    // that fails is not retried: a stale "you were added" is worse than none,
    // and the contest is waiting in the app either way.
    await this.prisma.notification.createMany({
      data: unnotified.map((userId) => ({
        userId,
        kind: 'social' as const,
        title: CREW_SEAT_PUSH_TITLE,
        body: CREW_SEAT_PUSH_BODY,
        payload: { matchId },
        idempotencyKey: this.seatKey(matchId, userId),
      })),
      skipDuplicates: true,
    });

    await this.push(matchId, unnotified);
  }

  private async excludeAlreadyNotified(
    matchId: string,
    userIds: readonly string[],
  ): Promise<string[]> {
    const existing = await this.prisma.notification.findMany({
      where: {
        idempotencyKey: {
          in: userIds.map((userId) => this.seatKey(matchId, userId)),
        },
      },
      select: { idempotencyKey: true },
    });

    const notified = new Set(existing.map((row) => row.idempotencyKey));

    return userIds.filter(
      (userId) => !notified.has(this.seatKey(matchId, userId)),
    );
  }

  private async push(
    matchId: string,
    userIds: readonly string[],
  ): Promise<void> {
    const devices = await this.prisma.pushDevice.findMany({
      where: { userId: { in: [...userIds] }, isActive: true },
      select: { expoPushToken: true },
    });

    if (devices.length === 0) {
      return;
    }

    const messages: PushMessage[] = devices.map((device) => ({
      expoPushToken: device.expoPushToken,
      title: CREW_SEAT_PUSH_TITLE,
      body: CREW_SEAT_PUSH_BODY,
      data: { matchId },
    }));

    const result = await this.pushSender.send(messages);
    await this.pushDevices.deactivateTokens(result.rejectedTokens);

    this.logger.log(
      `Crew seat push sent ${result.sentCount} of ${messages.length} messages`,
    );
  }

  private seatKey(matchId: string, userId: string): string {
    return `crew_seat:${matchId}:${userId}`;
  }
}
