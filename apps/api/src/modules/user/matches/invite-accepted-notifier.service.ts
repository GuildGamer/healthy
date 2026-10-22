import { Inject, Injectable, Logger } from '@nestjs/common';
import type { PrismaClient } from '@product/db';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import { PushDevicesService } from '../../shared-modules/push/push-devices.service.js';
import type { PushMessage, PushSender } from '../../shared-modules/push/push-sender.js';
import { PUSH_SENDER } from '../../shared-modules/push/push-sender.js';
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
  private readonly logger = new Logger(InviteAcceptedNotifierService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(PUSH_SENDER) private readonly pushSender: PushSender,
    private readonly pushDevices: PushDevicesService,
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

    await this.push(notice.matchId, notice.hostUserId, body);
  }

  private async push(matchId: string, hostUserId: string, body: string): Promise<void> {
    const devices = await this.pushDevices.groupPushDevicesFor([hostUserId]);

    if (devices.length === 0) {
      return;
    }

    const messages: PushMessage[] = devices.map((device) => ({
      expoPushToken: device.expoPushToken,
      title: INVITE_ACCEPTED_PUSH_TITLE,
      body,
      data: { matchId },
    }));

    const result = await this.pushSender.send(messages);
    await this.pushDevices.deactivateTokens(result.rejectedTokens);

    this.logger.log(`Invite accepted push sent ${result.sentCount} of ${messages.length} messages`);
  }

  private acceptanceKey(matchId: string, acceptedUserId: string): string {
    return `invite_accepted:${matchId}:${acceptedUserId}`;
  }
}
