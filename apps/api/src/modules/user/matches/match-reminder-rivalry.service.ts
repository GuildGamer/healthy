import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@product/db';
import { dayKeyFor } from '../../../shared/utils/day-key.js';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import type {
  ReminderRivalry,
  ReminderRivalryRequest,
  ReminderRivalrySource,
} from '../../shared-modules/engagement/index.js';
import { pickReminderRivalry } from './match-reminder-rivalry.js';
import { MatchesService } from './matches.service.js';

/** Wide enough to cover "today" in every zone; each row is then checked against the member's own day. */
const PUSHED_TODAY_LOOKBACK_MS = 48 * 60 * 60 * 1000;

/**
 * Hands the daily reminder a group worth naming. Fails closed on both social
 * rules: nothing for a member who turned group pushes off, and nothing about a
 * group that already reached them today — any inbox row carrying its match id
 * (a board move, a reaction, or an earlier reminder) spends that group's push.
 */
@Injectable()
export class MatchReminderRivalryService implements ReminderRivalrySource {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly matches: MatchesService,
  ) {}

  async loadMany(
    requests: readonly ReminderRivalryRequest[],
    now: Date,
  ): Promise<Map<string, ReminderRivalry>> {
    const optedIn = await this.groupOptedInUserIds(requests.map((request) => request.userId));
    const eligible = requests.filter((request) => optedIn.has(request.userId));
    const rivalries = new Map<string, ReminderRivalry>();
    if (eligible.length === 0) {
      return rivalries;
    }

    const pushedToday = await this.groupsPushedToday(eligible, now);

    for (const request of eligible) {
      const spent = pushedToday.get(request.userId) ?? new Set<string>();
      const contests = await this.matches.liveContestsForReminders(request.userId, now);
      const rivalry = pickReminderRivalry(
        contests.filter((contest) => !spent.has(contest.item.id)),
        now,
      );
      if (rivalry) {
        rivalries.set(request.userId, rivalry);
      }
    }

    return rivalries;
  }

  private async groupOptedInUserIds(userIds: readonly string[]): Promise<Set<string>> {
    const profiles = await this.prisma.userProfile.findMany({
      where: { userId: { in: [...userIds] }, groupNotificationsEnabled: true },
      select: { userId: true },
    });
    return new Set(profiles.map((profile) => profile.userId));
  }

  private async groupsPushedToday(
    requests: readonly ReminderRivalryRequest[],
    now: Date,
  ): Promise<Map<string, Set<string>>> {
    const timeZoneByUser = new Map(requests.map((request) => [request.userId, request.timeZone]));
    const rows = await this.prisma.notification.findMany({
      where: {
        userId: { in: [...timeZoneByUser.keys()] },
        createdAt: { gte: new Date(now.getTime() - PUSHED_TODAY_LOOKBACK_MS) },
      },
      select: { userId: true, payload: true, createdAt: true },
    });

    const spentByUser = new Map<string, Set<string>>();
    for (const row of rows) {
      const matchId = matchIdFromPayload(row.payload);
      const timeZone = timeZoneByUser.get(row.userId);
      if (!matchId || !timeZone || dayKeyFor(timeZone, row.createdAt) !== dayKeyFor(timeZone, now)) {
        continue;
      }

      const spent = spentByUser.get(row.userId) ?? new Set<string>();
      spent.add(matchId);
      spentByUser.set(row.userId, spent);
    }

    return spentByUser;
  }
}

function matchIdFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object' || !('matchId' in payload)) {
    return null;
  }

  const matchId = payload.matchId;
  return typeof matchId === 'string' && matchId.length > 0 ? matchId : null;
}
