import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  matchNudgePush,
  type MatchDailyScope,
  type MatchMetric,
  type MatchPushCopy,
  type MatchScoringMode,
} from '@product/contract';
import type { PrismaClient } from '@product/db';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import { PushDevicesService } from '../../shared-modules/push/push-devices.service.js';
import type { PushMessage, PushSender } from '../../shared-modules/push/push-sender.js';
import { PUSH_SENDER } from '../../shared-modules/push/push-sender.js';
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
  private readonly logger = new Logger(MatchReactionNotifierService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(PUSH_SENDER) private readonly pushSender: PushSender,
    private readonly pushDevices: PushDevicesService,
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

    await this.push(notice.matchId, notice.toUserId, copy);
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

  private async push(matchId: string, userId: string, copy: MatchPushCopy): Promise<void> {
    const devices = await this.pushDevices.groupPushDevicesFor([userId]);

    if (devices.length === 0) {
      return;
    }

    const messages: PushMessage[] = devices.map((device) => ({
      expoPushToken: device.expoPushToken,
      title: copy.title,
      body: copy.body,
      data: { matchId },
    }));

    const result = await this.pushSender.send(messages);
    await this.pushDevices.deactivateTokens(result.rejectedTokens);

    this.logger.log(`Match reaction push sent ${result.sentCount} of ${messages.length} messages`);
  }
}
