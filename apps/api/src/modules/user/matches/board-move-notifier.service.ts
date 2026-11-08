import { Inject, Injectable } from '@nestjs/common';
import { matchTimeLeft } from '@product/contract';
import type { PrismaClient } from '@product/db';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import { EngagementDeliveryService } from '../../shared-modules/engagement/index.js';
import {
  boardMoveIdempotencyKey,
  boardMovePushCopy,
  boardMoveUrgency,
  type BoardMoveUrgency,
} from './constants/board-move-notification.js';
import { GroupBoardPushContextService } from './group-board-push-context.service.js';
import {
  resolveGroupPushMode,
  selectPushRecipients,
} from './group-board-push-policy.js';
import type { RecipientPushState } from './types/group-board-push-policy.js';

export type BoardMoveRecipient = {
  userId: string;
  /** Their score on the board after this event (for close/tie/ahead copy). */
  score: number;
  /** Rank after this event (1 = leader). Used for busy fan-out. */
  rank: number;
  /**
   * When known: whether this recipient has already scored today. Unused for
   * attempt-driven contests until a caller supplies it.
   */
  movedToday?: boolean;
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
  /** Actor's rank after this event (for busy fan-out adjacency). */
  actorRank: number;
  /** ISO end of the contest, for the time left in the body. */
  endsAt: string;
  recipients: readonly BoardMoveRecipient[];
};

type InboxRow = {
  userId: string;
  kind: 'social';
  title: string;
  body: string;
  payload: { matchId: string };
  idempotencyKey: string;
  urgency: BoardMoveUrgency;
};

/**
 * Tells accepted group mates that someone moved the board. Inbox rows are
 * written per attempt for every mate; lock-screen pushes are filtered by the
 * group-board push policy (coalesce, routine suppression, grow/busy fan-out).
 * Retries are idempotent on (match, attempt, recipient); a failed push never
 * undoes the score write.
 */
@Injectable()
export class BoardMoveNotifierService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly delivery: EngagementDeliveryService,
    private readonly pushContext: GroupBoardPushContextService,
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
    const rows: InboxRow[] = pending.map((recipient) => {
      const urgency = boardMoveUrgency(
        notice.actorScoreAfter,
        recipient.score,
        notice.actorScoreBefore,
      );
      const copy = boardMovePushCopy({
        actorDisplayName: notice.actorDisplayName,
        urgency,
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
        urgency,
      };
    });

    // Inbox first — the idempotency record. Push failure must not undo scoring
    // and must not leave the recipient without an in-app notice.
    await this.prisma.notification.createMany({
      data: rows.map((row) => ({
        userId: row.userId,
        kind: row.kind,
        title: row.title,
        body: row.body,
        payload: row.payload,
        idempotencyKey: row.idempotencyKey,
      })),
      skipDuplicates: true,
    });

    const context = await this.pushContext.loadForNotify(
      notice.matchId,
      notice.actorUserId,
      rows.map((row) => row.userId),
      now,
    );
    const mode = resolveGroupPushMode(context);
    const recipientById = new Map(pending.map((row) => [row.userId, row]));
    const candidates: RecipientPushState[] = rows.map((row) => {
      const recipient = recipientById.get(row.userId);
      const history = context.historyByRecipient.get(row.userId);
      return {
        userId: row.userId,
        urgency: row.urgency,
        rank: recipient?.rank ?? Number.MAX_SAFE_INTEGER,
        actorRank: notice.actorRank,
        movedToday: recipient?.movedToday,
        pushedInCoalesceWindow: history?.pushedInCoalesceWindow ?? false,
      };
    });
    const decision = selectPushRecipients(mode, candidates);
    const rowByUserId = new Map(rows.map((row) => [row.userId, row]));
    const pushes = decision.pushUserIds.flatMap((userId) => {
      const row = rowByUserId.get(userId);
      if (!row) {
        return [];
      }
      return [
        {
          userId: row.userId,
          title: row.title,
          body: row.body,
          data: {
            matchId: notice.matchId,
            actorUserId: notice.actorUserId,
          },
          situation: row.urgency,
          templateKey: 'board_move',
        },
      ];
    });

    if (pushes.length === 0) {
      return;
    }

    await this.delivery.send({
      source: 'board_move',
      audience: 'group_opt_in',
      pushes,
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
