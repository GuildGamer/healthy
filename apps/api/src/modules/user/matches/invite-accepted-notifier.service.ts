import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@product/db';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import { EngagementDeliveryService } from '../../shared-modules/engagement/index.js';
import {
  INVITE_ACCEPTED_PUSH_TITLE,
  inviteAcceptedPushBody,
} from './constants/invite-accepted-notification.js';

export type InviteAcceptedNotice = {
  matchId: string;
  hostUserId: string;
  acceptedUserId: string;
  acceptedDisplayName: string;
};

/**
 * Tells the host, once, that someone accepted the invite they shared.
 * A retried accept must not ping them again.
 */
@Injectable()
export class InviteAcceptedNotifierService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly delivery: EngagementDeliveryService,
  ) {}

  async notifyHost(notice: InviteAcceptedNotice): Promise<void> {
    if (notice.acceptedUserId === notice.hostUserId) {
      return;
    }

    const idempotencyKey = this.acceptanceKey(notice.matchId, notice.acceptedUserId);
    const alreadyTold = await this.prisma.notification.findUnique({
      where: { idempotencyKey },
      select: { id: true },
    });

    if (alreadyTold) {
      return;
    }

    const body = inviteAcceptedPushBody(notice.acceptedDisplayName);

    await this.prisma.notification.createMany({
      data: [
        {
          userId: notice.hostUserId,
          kind: 'social' as const,
          title: INVITE_ACCEPTED_PUSH_TITLE,
          body,
          payload: { matchId: notice.matchId },
          idempotencyKey,
        },
      ],
      skipDuplicates: true,
    });

    await this.delivery.send({
      source: 'invite_accepted',
      audience: 'group_opt_in',
      pushes: [
        {
          userId: notice.hostUserId,
          title: INVITE_ACCEPTED_PUSH_TITLE,
          body,
          data: { matchId: notice.matchId },
        },
      ],
    });
  }

  private acceptanceKey(matchId: string, acceptedUserId: string): string {
    return `invite_accepted:${matchId}:${acceptedUserId}`;
  }
}
