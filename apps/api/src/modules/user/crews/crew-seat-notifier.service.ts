import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@product/db';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import { EngagementDeliveryService } from '../../shared-modules/engagement/index.js';
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
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly delivery: EngagementDeliveryService,
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

    await this.delivery.send({
      source: 'crew_seat',
      audience: 'group_opt_in',
      pushes: unnotified.map((userId) => ({
        userId,
        title: CREW_SEAT_PUSH_TITLE,
        body: CREW_SEAT_PUSH_BODY,
        data: { matchId },
      })),
    });
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

  private seatKey(matchId: string, userId: string): string {
    return `crew_seat:${matchId}:${userId}`;
  }
}
