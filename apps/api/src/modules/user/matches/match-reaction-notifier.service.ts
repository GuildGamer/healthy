import { Inject, Injectable } from '@nestjs/common';
import {
  matchNudgePush,
  type MatchDailyScope,
  type MatchMetric,
  type MatchPushCopy,
  type MatchScoringMode,
} from '@product/contract';
import type { PrismaClient } from '@product/db';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import { EngagementDeliveryService } from '../../shared-modules/engagement/index.js';
import {
  matchCheerIdempotencyKey,
  matchCheerPush,
  matchNudgeIdempotencyKey,
} from './constants/match-reaction-notification.js';
import type { NewMatchReaction } from './types/match-reaction.js';

export type MatchReactionNotice = NewMatchReaction & {
  senderName: string;
  group: {
    scoringMode: MatchScoringMode;
    metric: MatchMetric;
    dailyScope: MatchDailyScope;
    endsAt: string;
  };
};

/**
 * Tells a group mate they were cheered or nudged. The inbox row is the
 * idempotency record, so a retry never pushes twice; a failed push never
 * undoes the tap.
 */
@Injectable()
export class MatchReactionNotifierService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly delivery: EngagementDeliveryService,
  ) {}

  async notify(notice: MatchReactionNotice): Promise<void> {
    const copy = this.copyFor(notice);
    const { count } = await this.prisma.notification.createMany({
      data: [
        {
          userId: notice.toUserId,
          kind: 'social' as const,
          title: copy.title,
          body: copy.body,
          payload: { matchId: notice.matchId },
          idempotencyKey: this.idempotencyKeyFor(notice),
        },
      ],
      skipDuplicates: true,
    });

    if (count === 0) {
      return;
    }

    await this.delivery.send({
      source: 'match_reaction',
      audience: 'group_opt_in',
      pushes: [
        {
          userId: notice.toUserId,
          title: copy.title,
          body: copy.body,
          data: { matchId: notice.matchId },
        },
      ],
    });
  }

  private copyFor(notice: MatchReactionNotice): MatchPushCopy {
    const input = { senderName: notice.senderName, ...notice.group };
    return notice.kind === 'cheer' ? matchCheerPush(input) : matchNudgePush(input);
  }

  private idempotencyKeyFor(notice: MatchReactionNotice): string {
    if (notice.kind === 'cheer') {
      return matchCheerIdempotencyKey(notice.matchId, notice.toUserId, notice.dayKey);
    }

    return matchNudgeIdempotencyKey(
      notice.matchId,
      notice.fromUserId,
      notice.toUserId,
      notice.dayKey,
    );
  }
}
