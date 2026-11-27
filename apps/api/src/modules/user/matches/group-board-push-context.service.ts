import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@product/db';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import { BOARD_PUSH_COALESCE_MS } from './constants/group-board-push-policy.js';

export type BoardPushRecipientHistory = {
  pushedInCoalesceWindow: boolean;
};

export type GroupBoardPushContext = {
  historyByRecipient: Map<string, BoardPushRecipientHistory>;
};

type DeliveryRow = {
  userId: string;
  sentAt: Date;
  payload: unknown;
};

/**
 * Loads recent board_move deliveries for same-actor routine coalesce.
 * Bounded to one match and the recipient list for that notify call.
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
    const coalesceSince = new Date(now.getTime() - BOARD_PUSH_COALESCE_MS);

    const deliveries: DeliveryRow[] =
      recipientUserIds.length === 0
        ? []
        : await this.prisma.engagementDelivery.findMany({
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
          });

    const historyByRecipient = new Map<string, BoardPushRecipientHistory>();
    for (const userId of recipientUserIds) {
      const pushedInCoalesceWindow = deliveries.some(
        (row) =>
          row.userId === userId &&
          isBoardMoveForActor(row.payload, matchId, actorUserId),
      );

      historyByRecipient.set(userId, { pushedInCoalesceWindow });
    }

    return { historyByRecipient };
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
