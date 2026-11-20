import { Inject, Injectable } from '@nestjs/common';
import type { MatchReactionSent } from '@product/contract';
import type { PrismaClient } from '@product/db';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import type { NewMatchReaction } from './types/match-reaction.js';

/**
 * Cheers and nudges. The table's unique key is the rate limit: one of each
 * kind per pair per contest day, so a retry or a second tap is a no-op.
 */
@Injectable()
export class MatchReactionsService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  /** True only for the tap that wrote the row, which is the one that may push. */
  async record(reaction: NewMatchReaction): Promise<boolean> {
    const { count } = await this.prisma.matchReaction.createMany({
      data: [reaction],
      skipDuplicates: true,
    });

    return count > 0;
  }

  /** What the viewer already sent each member on `dayKey`, at most one of each kind. */
  async sentBy(
    matchId: string,
    fromUserId: string,
    dayKey: string,
  ): Promise<Map<string, MatchReactionSent[]>> {
    const rows = await this.prisma.matchReaction.findMany({
      where: { matchId, fromUserId, dayKey },
      select: { toUserId: true, kind: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const sentByRecipient = new Map<string, MatchReactionSent[]>();
    for (const row of rows) {
      const sent = sentByRecipient.get(row.toUserId) ?? [];
      sent.push({ kind: row.kind, sentAt: row.createdAt.toISOString() });
      sentByRecipient.set(row.toUserId, sent);
    }

    return sentByRecipient;
  }
}
