import { Inject, Injectable } from '@nestjs/common';
import type { Prisma, PrismaClient } from '@product/db';
import { type AuthenticatedUser, requireUser } from '../../../shared/types/authenticated-user.js';
import { rankingWindow, startOfUtcDay, weekStartKey } from '../../../shared/utils/week.js';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import { LEADERBOARD_SIZE, NEIGHBOURS_EACH_SIDE, NO_STANDING } from './constants/leaderboard.js';
import type { LeaderboardEntryDto, ListLeaderboardDto, ListLeaderboardQuery } from './dto/index.js';
import type { CurrentUserStanding, UserTotal } from './types/standing.js';
import type { LedgerWindow } from './types/ledger-window.js';
import { publicNameFor } from './pseudonym.js';

@Injectable()
export class LeaderboardService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async listWeekly(currentUser: AuthenticatedUser | null | undefined): Promise<ListLeaderboardDto> {
    return this.list(currentUser, { period: 'week' });
  }

  async list(
    currentUser: AuthenticatedUser | null | undefined,
    query: ListLeaderboardQuery = {},
    now: Date = new Date(),
  ): Promise<ListLeaderboardDto> {
    const user = requireUser(currentUser);
    const period = query.period ?? 'week';
    const { start, periodStart } = rankingWindow(period, now);
    const window: LedgerWindow = { start, end: null, category: query.category };
    const where = this.ledgerWhere(window);

    const topTotals = await this.totals(where, LEADERBOARD_SIZE);
    const entries = await this.toEntries(topTotals, 0, user.id);

    const currentUserPoints = await this.pointsFor(user.id, window);
    const currentUserVisible = await this.isVisibleOnLeaderboard(user.id);
    const standing = currentUserVisible
      ? await this.standingFor(user.id, currentUserPoints, where)
      : NO_STANDING;
    const currentUserRankAtDayStart =
      standing.rank === null ? null : await this.rankAtDayStart(user.id, window, now);

    return {
      weekStart: weekStartKey(now),
      period,
      periodStart,
      entries,
      currentUserRank: standing.rank,
      currentUserRankAtDayStart,
      currentUserPoints,
      currentUserVisible,
      aroundCurrentUser: standing.around,
    };
  }

  /**
   * The caller's place and the people either side of it, read from one
   * ordered pass so both agree with `entries`, ties included. The pass walks
   * every scoring user — acceptable at this size, and the point to revisit
   * with a materialised ranking before the user base grows.
   */
  private async standingFor(
    userId: string,
    points: number,
    where: Prisma.PointLedgerEntryWhereInput,
  ): Promise<CurrentUserStanding> {
    if (points === 0) {
      return NO_STANDING;
    }

    const ordered = await this.totals(where);
    const index = ordered.findIndex((total) => total.userId === userId);
    if (index === -1) {
      return NO_STANDING;
    }

    const firstIndex = Math.max(0, index - NEIGHBOURS_EACH_SIDE);
    const neighbours = ordered.slice(firstIndex, index + NEIGHBOURS_EACH_SIDE + 1);
    return { rank: index + 1, around: await this.toEntries(neighbours, firstIndex, userId) };
  }

  private async toEntries(
    totals: readonly UserTotal[],
    firstIndex: number,
    currentUserId: string,
  ): Promise<LeaderboardEntryDto[]> {
    const displayNames = await this.displayNamesFor(totals.map((total) => total.userId));

    return totals.map((total, offset) => ({
      rank: firstIndex + offset + 1,
      displayName: publicNameFor(total.userId, displayNames.get(total.userId)),
      points: total.points,
      isCurrentUser: total.userId === currentUserId,
    }));
  }

  /**
   * The same ranking with today's points left out. The day is the UTC one
   * the windows are cut on, so on the day a window opens there is nothing
   * earlier to compare against.
   */
  private async rankAtDayStart(
    userId: string,
    window: LedgerWindow,
    now: Date,
  ): Promise<number | null> {
    const dayStart = startOfUtcDay(now);
    if (window.start && dayStart.getTime() <= window.start.getTime()) {
      return null;
    }

    const earlierWindow: LedgerWindow = { ...window, end: dayStart };
    const pointsThen = await this.pointsFor(userId, earlierWindow);
    return this.rankFor(userId, pointsThen, this.ledgerWhere(earlierWindow));
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
      OR: [{ user: { profile: { is: null } } }, { user: { profile: { showOnLeaderboard: true } } }],
    };
  }

  private ledgerWhere(window: LedgerWindow): Prisma.PointLedgerEntryWhereInput {
    return {
      ...this.windowFilter(window),
      ...this.visibleOnLeaderboard(),
    };
  }

  private windowFilter(window: LedgerWindow): Prisma.PointLedgerEntryWhereInput {
    const createdAt: Prisma.DateTimeFilter = {
      ...(window.start ? { gte: window.start } : {}),
      ...(window.end ? { lt: window.end } : {}),
    };

    return {
      ...(window.start || window.end ? { createdAt } : {}),
      ...(window.category
        ? {
            userChallenge: {
              is: {
                challenge: { category: window.category },
              },
            },
          }
        : {}),
    };
  }

  /** Every scoring user, best first, unless `take` caps it. */
  private async totals(
    where: Prisma.PointLedgerEntryWhereInput,
    take?: number,
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

  private async displayNamesFor(userIds: string[]): Promise<Map<string, string | null>> {
    if (userIds.length === 0) {
      return new Map();
    }

    const profiles = await this.prisma.userProfile.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, displayName: true },
    });

    return new Map(profiles.map((profile) => [profile.userId, profile.displayName]));
  }

  private async pointsFor(userId: string, window: LedgerWindow): Promise<number> {
    const total = await this.prisma.pointLedgerEntry.aggregate({
      where: { userId, ...this.windowFilter(window) },
      _sum: { delta: true },
    });

    return total._sum.delta ?? 0;
  }

  /** Counts who is ahead, which walks every scoring user, as `standingFor` does. */
  private async rankFor(
    userId: string,
    points: number,
    where: Prisma.PointLedgerEntryWhereInput,
  ): Promise<number | null> {
    if (points === 0) {
      return null;
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
