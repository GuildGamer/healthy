import { Inject, Injectable, Logger } from '@nestjs/common';
import type { PrismaClient } from '@product/db';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import { PushDevicesService } from '../../shared-modules/push/push-devices.service.js';
import type { PushMessage, PushSender } from '../../shared-modules/push/push-sender.js';
import { PUSH_SENDER } from '../../shared-modules/push/push-sender.js';
import {
  boardMoveIdempotencyKey,
  boardMovePushBody,
  boardMovePushTitle,
  boardMoveUrgency,
} from './constants/board-move-notification.js';

export type BoardMoveRecipient = {
  userId: string;
  /** Their score on the board after this event (for close/tie/ahead copy). */
  score: number;
};

export type BoardMoveNotice = {
  matchId: string;
  attemptOrEventId: string;
  actorUserId: string;
  actorDisplayName: string;
  /** Actor's score before this event (for "just passed you" vs already ahead). */
  actorScoreBefore: number;
  /** Actor's score after this event. */
  actorScoreAfter: number;
  recipients: readonly BoardMoveRecipient[];
};

/**
 * Tells accepted group mates that someone moved the board. Per-recipient copy
 * escalates when the actor is close to, tied with, or ahead of them. Retries
 * are idempotent on (match, attempt, recipient); a failed push never undoes
 * the score write.
 */
@Injectable()
export class BoardMoveNotifierService {
  private readonly logger = new Logger(BoardMoveNotifierService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(PUSH_SENDER) private readonly pushSender: PushSender,
    private readonly pushDevices: PushDevicesService,
  ) {}

  async notifyParticipants(notice: BoardMoveNotice): Promise<void> {
    const recipients = notice.recipients.filter(
      (recipient) => recipient.userId !== notice.actorUserId,
    );

    if (recipients.length === 0) {
      return;
    }

    const pending = await this.excludeAlreadyNotified(
      notice.matchId,
      notice.attemptOrEventId,
      recipients,
    );

    if (pending.length === 0) {
      return;
    }

    const rows = pending.map((recipient) => {
      const urgency = boardMoveUrgency(
        notice.actorScoreAfter,
        recipient.score,
        notice.actorScoreBefore,
      );
      return {
        userId: recipient.userId,
        kind: 'social' as const,
        title: boardMovePushTitle(urgency),
        body: boardMovePushBody(notice.actorDisplayName, urgency),
        idempotencyKey: boardMoveIdempotencyKey(
          notice.matchId,
          notice.attemptOrEventId,
          recipient.userId,
        ),
      };
    });

    // Inbox first — the idempotency record. Push failure must not undo scoring
    // and must not leave the recipient without an in-app notice.
    await this.prisma.notification.createMany({
      data: rows,
      skipDuplicates: true,
    });

    await this.push(notice.matchId, rows);
  }

  private async excludeAlreadyNotified(
    matchId: string,
    attemptOrEventId: string,
    recipients: readonly BoardMoveRecipient[],
  ): Promise<BoardMoveRecipient[]> {
    const existing = await this.prisma.notification.findMany({
      where: {
        idempotencyKey: {
          in: recipients.map((recipient) =>
            boardMoveIdempotencyKey(matchId, attemptOrEventId, recipient.userId),
          ),
        },
      },
      select: { idempotencyKey: true },
    });

    const notified = new Set(existing.map((row) => row.idempotencyKey));

    return recipients.filter(
      (recipient) =>
        !notified.has(
          boardMoveIdempotencyKey(matchId, attemptOrEventId, recipient.userId),
        ),
    );
  }

  private async push(
    matchId: string,
    rows: readonly { userId: string; title: string; body: string }[],
  ): Promise<void> {
    const devices = await this.prisma.pushDevice.findMany({
      where: {
        userId: { in: rows.map((row) => row.userId) },
        isActive: true,
      },
      select: { userId: true, expoPushToken: true },
    });

    if (devices.length === 0) {
      return;
    }

    const copyByUser = new Map(rows.map((row) => [row.userId, row]));
    const messages: PushMessage[] = [];

    for (const device of devices) {
      const copy = copyByUser.get(device.userId);
      if (!copy) {
        continue;
      }

      messages.push({
        expoPushToken: device.expoPushToken,
        title: copy.title,
        body: copy.body,
        data: { matchId },
      });
    }

    if (messages.length === 0) {
      return;
    }

    const result = await this.pushSender.send(messages);
    await this.pushDevices.deactivateTokens(result.rejectedTokens);

    this.logger.log(
      `Board move push sent ${result.sentCount} of ${messages.length} messages`,
    );
  }
}
