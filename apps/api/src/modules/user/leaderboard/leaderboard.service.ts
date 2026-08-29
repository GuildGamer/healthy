import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@product/db';
import {
  type AuthenticatedUser,
  requireUser,
} from '../../../shared/types/authenticated-user.js';
import { startOfUtcWeek, weekStartKey } from '../../../shared/utils/week.js';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import { LEADERBOARD_SIZE } from './constants/leaderboard.js';
import type { LeaderboardEntryDto, ListLeaderboardDto } from './dto/index.js';
import { publicNameFor } from './pseudonym.js';

type WeeklyTotal = {
  userId: string;
  points: number;
};

@Injectable()
export class LeaderboardService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async listWeekly(
    currentUser: AuthenticatedUser | null | undefined,
  ): Promise<ListLeaderboardDto> {
    const user = requireUser(currentUser);
    const weekStart = startOfUtcWeek();

    const topTotals = await this.weeklyTotals(weekStart, LEADERBOARD_SIZE);
    const displayNames = await this.displayNamesFor(
      topTotals.map((total) => total.userId),
    );

    const entries = topTotals.map((total, index) => ({
      rank: index + 1,
      displayName: publicNameFor(total.userId, displayNames.get(total.userId)),
      points: total.points,
      isCurrentUser: total.userId === user.id,
    }));

    const currentUserPoints = await this.pointsThisWeek(user.id, weekStart);
    const currentUserRank = await this.rankFor(
      user.id,
      currentUserPoints,
      weekStart,
      entries,
    );

    return {
      weekStart: weekStartKey(),
      entries,
      currentUserRank,
      currentUserPoints,
    };
  }

  private visibleOnLeaderboard() {
    return {
      OR: [
        { user: { profile: { is: null } } },
        { user: { profile: { showOnLeaderboard: true } } },
      ],
    };
  }

  private async weeklyTotals(
    weekStart: Date,
    take: number,
  ): Promise<WeeklyTotal[]> {
    const grouped = await this.prisma.pointLedgerEntry.groupBy({
      by: ['userId'],
      where: {
        createdAt: { gte: weekStart },
        ...this.visibleOnLeaderboard(),
      },
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

  private async pointsThisWeek(
    userId: string,
    weekStart: Date,
  ): Promise<number> {
    const total = await this.prisma.pointLedgerEntry.aggregate({
      where: { userId, createdAt: { gte: weekStart } },
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
    weekStart: Date,
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
        createdAt: { gte: weekStart },
        userId: { not: userId },
        ...this.visibleOnLeaderboard(),
      },
      _sum: { delta: true },
      having: { delta: { _sum: { gt: points } } },
    });

    return ahead.length + 1;
  }
}
