import { Inject, Injectable, Logger } from '@nestjs/common';
import type { PrismaClient } from '@product/db';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import { EngagementDeliveryService } from '../../shared-modules/engagement/index.js';
import {
  matchSettledIdempotencyKey,
  matchSettledPushCopy,
} from './constants/match-settled-notification.js';

export type MatchSettledNotice = {
  matchId: string;
  contestTitle: string;
  winnerUserId: string | null;
  winnerDisplayName: string | null;
  /** Accepted members only — pending seats never hear about settlement. */
  recipientUserIds: readonly string[];
};

/**
 * One push per accepted member when a contest settles. Idempotent on
 * (match, user) so a concurrent settle or a retried open cannot ping twice.
 */
@Injectable()
export class MatchSettledNotifierService {
  private readonly logger = new Logger(MatchSettledNotifierService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly delivery: EngagementDeliveryService,
  ) {}

  async notifyParticipants(notice: MatchSettledNotice): Promise<void> {
    if (notice.recipientUserIds.length === 0) {
      return;
    }

    const pending = await this.excludeAlreadyNotified(
      notice.matchId,
      notice.recipientUserIds,
    );
    if (pending.length === 0) {
      return;
    }

    const rows = pending.map((userId) => {
      const copy = matchSettledPushCopy({
        contestTitle: notice.contestTitle,
        isWinner: userId === notice.winnerUserId,
        winnerDisplayName: notice.winnerDisplayName,
      });

      return {
        userId,
        kind: 'social' as const,
        title: copy.title,
        body: copy.body,
        payload: {
          matchId: notice.matchId,
          destination: 'match_result' as const,
        },
        idempotencyKey: matchSettledIdempotencyKey(notice.matchId, userId),
      };
    });

    await this.prisma.notification.createMany({
      data: rows,
      skipDuplicates: true,
    });

    try {
      await this.delivery.send({
        source: 'match_settled',
        audience: 'group_opt_in',
        pushes: rows.map((row) => ({
          userId: row.userId,
          title: row.title,
          body: row.body,
          data: {
            matchId: notice.matchId,
            destination: 'match_result',
          },
        })),
      });
    } catch (error) {
      this.logger.error(`Could not send match_settled for ${notice.matchId}`, error);
    }
  }

  private async excludeAlreadyNotified(
    matchId: string,
    userIds: readonly string[],
  ): Promise<string[]> {
    const existing = await this.prisma.notification.findMany({
      where: {
        idempotencyKey: {
          in: userIds.map((userId) => matchSettledIdempotencyKey(matchId, userId)),
        },
      },
      select: { idempotencyKey: true },
    });

    const sent = new Set(existing.map((row) => row.idempotencyKey));
    return userIds.filter(
      (userId) => !sent.has(matchSettledIdempotencyKey(matchId, userId)),
    );
  }
}
