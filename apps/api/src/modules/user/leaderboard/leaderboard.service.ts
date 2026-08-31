import { Inject, Injectable } from '@nestjs/common';
import type { HealthCategory } from '@product/contract';
import type { Prisma, PrismaClient } from '@product/db';
import {
  type AuthenticatedUser,
  requireUser,
} from '../../../shared/types/authenticated-user.js';
import {
  rankingWindow,
  weekStartKey,
} from '../../../shared/utils/week.js';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import { LEADERBOARD_SIZE } from './constants/leaderboard.js';
import type {
  LeaderboardEntryDto,
  ListLeaderboardDto,
  ListLeaderboardQuery,
} from './dto/index.js';
import { publicNameFor } from './pseudonym.js';

type UserTotal = {
  userId: string;
  points: number;
};

@Injectable()
export class LeaderboardService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async listWeekly(
    currentUser: AuthenticatedUser | null | undefined,
  ): Promise<ListLeaderboardDto> {
    return this.list(currentUser, { period: 'week' });
  }

  async list(
    currentUser: AuthenticatedUser | null | undefined,
    query: ListLeaderboardQuery = {},
  ): Promise<ListLeaderboardDto> {
    const user = requireUser(currentUser);
    const period = query.period ?? 'week';
    const { start, periodStart } = rankingWindow(period);
    const where = this.ledgerWhere(start, query.category);

    const topTotals = await this.totals(where, LEADERBOARD_SIZE);
    const displayNames = await this.displayNamesFor(
      topTotals.map((total) => total.userId),
    );

    const entries = topTotals.map((total, index) => ({
      rank: index + 1,
      displayName: publicNameFor(total.userId, displayNames.get(total.userId)),
      points: total.points,
      isCurrentUser: total.userId === user.id,
    }));

    const currentUserPoints = await this.pointsFor(
      user.id,
      start,
      query.category,
    );
    const currentUserVisible = await this.isVisibleOnLeaderboard(user.id);
    const currentUserRank = currentUserVisible
      ? await this.rankFor(user.id, currentUserPoints, where, entries)
      : null;

    return {
      weekStart: weekStartKey(),
      period,
      periodStart,
      entries,
      currentUserRank,
      currentUserPoints,
      currentUserVisible,
    };
  }

  private async isVisibleOnLeaderboard(userId: string): Promise<boolean> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { showOnLeaderboard: true },
    });

    // No profile yet → treated as visible (matches ledger OR profile-is-null).
    return profile?.showOnLeaderboard ?? true;
  }

  private visibleOnLeaderboard(): Prisma.PointLedgerEntryWhereInput {
    return {
      OR: [
        { user: { profile: { is: null } } },
        { user: { profile: { showOnLeaderboard: true } } },
      ],
    };
  }

  private ledgerWhere(
    start: Date | null,
    category?: HealthCategory,
  ): Prisma.PointLedgerEntryWhereInput {
    return {
      ...(start ? { createdAt: { gte: start } } : {}),
      ...(category
        ? {
            userChallenge: {
              is: {
                challenge: { category },
              },
            },
          }
        : {}),
      ...this.visibleOnLeaderboard(),
    };
  }

  private async totals(
    where: Prisma.PointLedgerEntryWhereInput,
    take: number,
  ): Promise<UserTotal[]> {
    const grouped = await this.prisma.pointLedgerEntry.groupBy({
      by: ['userId'],
      where,
      _sum: { delta: true },
      // userId breaks ties so equal scores keep a stable order between reads.
      orderBy: [{ _sum: { delta: 'desc' } }, { userId: 'asc' }],
      take,
    });

    return grouped.map((row) => ({
      userId: row.userId,
      points: row._sum.delta ?? 0,
    }));
  }

  private async displayNamesFor(
    userIds: string[],
  ): Promise<Map<string, string | null>> {
    if (userIds.length === 0) {
      return new Map();
    }

    const profiles = await this.prisma.userProfile.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, displayName: true },
    });

    return new Map(
      profiles.map((profile) => [profile.userId, profile.displayName]),
    );
  }

  private async pointsFor(
    userId: string,
    start: Date | null,
    category?: HealthCategory,
  ): Promise<number> {
    const total = await this.prisma.pointLedgerEntry.aggregate({
      where: {
        userId,
        ...(start ? { createdAt: { gte: start } } : {}),
        ...(category
          ? {
              userChallenge: {
                is: {
                  challenge: { category },
                },
              },
            }
          : {}),
      },
      _sum: { delta: true },
    });

    return total._sum.delta ?? 0;
  }

  /**
   * Reuses the page when the user is on it. Otherwise it counts who is ahead,
   * which walks every scoring user — acceptable at this size, and the point to
   * revisit with a materialised ranking before the user base grows.
   */
  private async rankFor(
    userId: string,
    points: number,
    where: Prisma.PointLedgerEntryWhereInput,
    entries: LeaderboardEntryDto[],
  ): Promise<number | null> {
    if (points === 0) {
      return null;
    }

    const onPage = entries.find((entry) => entry.isCurrentUser);
    if (onPage) {
      return onPage.rank;
    }

    const ahead = await this.prisma.pointLedgerEntry.groupBy({
      by: ['userId'],
      where: {
        ...where,
        userId: { not: userId },
      },
      _sum: { delta: true },
      having: { delta: { _sum: { gt: points } } },
    });

    return ahead.length + 1;
  }
}
