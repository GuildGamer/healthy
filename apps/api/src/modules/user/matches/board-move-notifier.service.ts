import { Inject, Injectable } from '@nestjs/common';
import { matchTimeLeft } from '@product/contract';
import type { PrismaClient } from '@product/db';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import { EngagementDeliveryService } from '../../shared-modules/engagement/index.js';
import {
  boardMoveIdempotencyKey,
  boardMovePushCopy,
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
  /** ISO end of the contest, for the time left in the body. */
  endsAt: string;
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
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly delivery: EngagementDeliveryService,
  ) {}

  async notifyParticipants(notice: BoardMoveNotice, now: Date = new Date()): Promise<void> {
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

    const timeLeft = matchTimeLeft(notice.endsAt, now);
    const rows = pending.map((recipient) => {
      const copy = boardMovePushCopy({
        actorDisplayName: notice.actorDisplayName,
        urgency: boardMoveUrgency(
          notice.actorScoreAfter,
          recipient.score,
          notice.actorScoreBefore,
        ),
        actorScore: notice.actorScoreAfter,
        recipientScore: recipient.score,
        timeLeft,
      });
      return {
        userId: recipient.userId,
        kind: 'social' as const,
        title: copy.title,
        body: copy.body,
        payload: { matchId: notice.matchId },
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

    await this.delivery.send({
      source: 'board_move',
      audience: 'group_opt_in',
      pushes: rows.map((row) => ({
        userId: row.userId,
        title: row.title,
        body: row.body,
        data: { matchId: notice.matchId },
      })),
    });
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
        !notified.has(boardMoveIdempotencyKey(matchId, attemptOrEventId, recipient.userId)),
    );
  }
}
