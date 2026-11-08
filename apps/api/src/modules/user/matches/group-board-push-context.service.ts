import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@product/db';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import { BOARD_PUSH_COALESCE_MS } from './constants/group-board-push-policy.js';
import type { GroupPushModeInput } from './types/group-board-push-policy.js';

export type BoardPushRecipientHistory = {
  pushedInCoalesceWindow: boolean;
};

export type GroupBoardPushContext = GroupPushModeInput & {
  historyByRecipient: Map<string, BoardPushRecipientHistory>;
};

type DeliveryRow = {
  userId: string;
  sentAt: Date;
  payload: unknown;
};

/**
 * Loads the match velocity and recent board_move deliveries the push policy
 * needs. Bounded to one match and the recipient list for that notify call.
 */
@Injectable()
export class GroupBoardPushContextService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async loadForNotify(
    matchId: string,
    actorUserId: string,
    recipientUserIds: readonly string[],
    now: Date = new Date(),
  ): Promise<GroupBoardPushContext> {
    const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const since60m = new Date(now.getTime() - 60 * 60 * 1000);
    const coalesceSince = new Date(now.getTime() - BOARD_PUSH_COALESCE_MS);

    const [acceptedCount, attemptsLast24h, attemptsLast60m, deliveries] =
      await Promise.all([
        this.prisma.matchParticipant.count({
          where: { matchId, acceptedAt: { not: null } },
        }),
        this.prisma.matchAttempt.count({
          where: { matchId, recordedAt: { gte: since24h } },
        }),
        this.prisma.matchAttempt.count({
          where: { matchId, recordedAt: { gte: since60m } },
        }),
        recipientUserIds.length === 0
          ? Promise.resolve([] as DeliveryRow[])
          : this.prisma.engagementDelivery.findMany({
              where: {
                userId: { in: [...recipientUserIds] },
                source: 'board_move',
                sentAt: { gte: coalesceSince },
              },
              select: {
                userId: true,
                sentAt: true,
                payload: true,
              },
            }),
      ]);

    const historyByRecipient = new Map<string, BoardPushRecipientHistory>();
    for (const userId of recipientUserIds) {
      const pushedInCoalesceWindow = deliveries.some(
        (row) =>
          row.userId === userId &&
          isBoardMoveForActor(row.payload, matchId, actorUserId),
      );

      historyByRecipient.set(userId, { pushedInCoalesceWindow });
    }

    return {
      acceptedCount,
      attemptsLast60m,
      attemptsLast24h,
      historyByRecipient,
    };
  }
}

function isBoardMoveForActor(
  payload: unknown,
  matchId: string,
  actorUserId: string,
): boolean {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const record = payload as Record<string, unknown>;
  return record.matchId === matchId && record.actorUserId === actorUserId;
}
