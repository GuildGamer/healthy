import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@product/db';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import { BUSY_VELOCITY_WINDOW_MS } from './constants/group-board-push-policy.js';
import type { GroupPushModeInput } from './types/group-board-push-policy.js';

export type GroupBoardPushContext = GroupPushModeInput;

/**
 * Loads match size and recent attempt velocity for the board push policy.
 * Bounded to one match per notify call.
 */
@Injectable()
export class GroupBoardPushContextService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async loadForNotify(
    matchId: string,
    _actorUserId: string,
    _recipientUserIds: readonly string[],
    now: Date = new Date(),
  ): Promise<GroupBoardPushContext> {
    const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const since30m = new Date(now.getTime() - BUSY_VELOCITY_WINDOW_MS);

    const [acceptedCount, attemptsLast24h, attemptsLast30m] = await Promise.all([
      this.prisma.matchParticipant.count({
        where: { matchId, acceptedAt: { not: null } },
      }),
      this.prisma.matchAttempt.count({
        where: { matchId, recordedAt: { gte: since24h } },
      }),
      this.prisma.matchAttempt.count({
        where: { matchId, recordedAt: { gte: since30m } },
      }),
    ]);

    return {
      acceptedCount,
      attemptsLast30m,
      attemptsLast24h,
    };
  }
}
