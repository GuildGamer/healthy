import { Inject, Injectable, Logger } from '@nestjs/common';
import type { PrismaClient } from '@product/db';
import {
  dayKeyFor,
  DEFAULT_TIME_ZONE,
  localMinuteOfDay,
} from '../../../shared/utils/day-key.js';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import {
  EngagementDeliveryService,
  isQuietLocalMinute,
} from '../../shared-modules/engagement/index.js';
import { CrewsService } from '../crews/index.js';
import { groupNameFor } from '../../../shared/utils/group-name.js';
import {
  FRIEND_MILESTONE_INACTIVE_MS,
  friendMilestonePushCopy,
} from './constants/friend-milestone.js';

export type FriendMilestoneNotice = {
  actorUserId: string;
  milestoneKey: string;
  now?: Date;
};

/**
 * One soft nudge when someone you already competed with hits a rare milestone.
 * Quiet hours, one-per-local-day, and an inactivity gate keep it from feeling
 * like a feed.
 */
@Injectable()
export class FriendMilestoneNotifierService {
  private readonly logger = new Logger(FriendMilestoneNotifierService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly crews: CrewsService,
    private readonly delivery: EngagementDeliveryService,
  ) {}

  async notifyAcquaintances(notice: FriendMilestoneNotice): Promise<void> {
    const now = notice.now ?? new Date();
    const recipientIds = await this.crews.allowedInviteeIds(notice.actorUserId);
    if (recipientIds.size === 0) {
      return;
    }

    const actor = await this.prisma.user.findUnique({
      where: { id: notice.actorUserId },
      select: {
        id: true,
        name: true,
        profile: { select: { displayName: true } },
      },
    });
    if (!actor) {
      return;
    }

    const actorName = groupNameFor(actor);
    const copy = friendMilestonePushCopy(actorName, notice.milestoneKey);
    const candidates = [...recipientIds];

    const eligible = await this.filterEligible(candidates, now);
    if (eligible.length === 0) {
      return;
    }

    const toNotify: string[] = [];
    for (const recipientId of eligible) {
      const profile = await this.prisma.userProfile.findUnique({
        where: { userId: recipientId },
        select: { timeZone: true },
      });
      const timeZone = profile?.timeZone ?? DEFAULT_TIME_ZONE;
      const dayKey = dayKeyFor(timeZone, now);
      const idempotencyKey = this.milestoneKey(
        recipientId,
        notice.actorUserId,
        notice.milestoneKey,
        dayKey,
      );

      const created = await this.prisma.notification.createMany({
        data: [
          {
            userId: recipientId,
            kind: 'social' as const,
            title: copy.title,
            body: copy.body,
            payload: {
              destination: 'match_create',
              withUserId: notice.actorUserId,
            },
            idempotencyKey,
          },
        ],
        skipDuplicates: true,
      });

      if (created.count > 0) {
        toNotify.push(recipientId);
      }
    }

    if (toNotify.length === 0) {
      return;
    }

    try {
      await this.delivery.send({
        source: 'friend_milestone',
        audience: 'group_opt_in',
        pushes: toNotify.map((userId) => ({
          userId,
          title: copy.title,
          body: copy.body,
          data: {
            destination: 'match_create',
            withUserId: notice.actorUserId,
          },
        })),
      });
    } catch (error) {
      this.logger.error(
        `Could not send friend_milestone for ${notice.milestoneKey}`,
        error,
      );
    }
  }

  /**
   * Quiet hours, one friend_milestone per local day, and inactive in the last
   * 18 hours. Opt-in is enforced by the delivery audience.
   */
  private async filterEligible(
    recipientIds: readonly string[],
    now: Date,
  ): Promise<string[]> {
    if (recipientIds.length === 0) {
      return [];
    }

    const profiles = await this.prisma.userProfile.findMany({
      where: { userId: { in: [...recipientIds] } },
      select: { userId: true, timeZone: true },
    });
    const timeZoneByUser = new Map(
      profiles.map((row) => [row.userId, row.timeZone ?? DEFAULT_TIME_ZONE]),
    );

    const notQuiet: string[] = [];
    for (const userId of recipientIds) {
      const timeZone = timeZoneByUser.get(userId) ?? DEFAULT_TIME_ZONE;
      if (isQuietLocalMinute(localMinuteOfDay(timeZone, now))) {
        continue;
      }
      notQuiet.push(userId);
    }

    if (notQuiet.length === 0) {
      return [];
    }

    const afterCap = await this.excludeAlreadyNudgedToday(notQuiet, timeZoneByUser, now);
    if (afterCap.length === 0) {
      return [];
    }

    const active = await this.recentlyActiveUserIds(afterCap, now);
    return afterCap.filter((userId) => !active.has(userId));
  }

  private async excludeAlreadyNudgedToday(
    userIds: readonly string[],
    timeZoneByUser: Map<string, string>,
    now: Date,
  ): Promise<string[]> {
    const since = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const rows = await this.prisma.engagementDelivery.findMany({
      where: {
        userId: { in: [...userIds] },
        source: 'friend_milestone',
        sentAt: { gte: since },
      },
      select: { userId: true, sentAt: true },
    });

    const nudgedToday = new Set<string>();
    for (const row of rows) {
      const timeZone = timeZoneByUser.get(row.userId) ?? DEFAULT_TIME_ZONE;
      if (dayKeyFor(timeZone, row.sentAt) === dayKeyFor(timeZone, now)) {
        nudgedToday.add(row.userId);
      }
    }

    // Inbox keys also count: a write that never reached Expo still spent the day.
    const dayKeys = [
      ...new Set(
        userIds.map((userId) =>
          dayKeyFor(timeZoneByUser.get(userId) ?? DEFAULT_TIME_ZONE, now),
        ),
      ),
    ];
    const inbox = await this.prisma.notification.findMany({
      where: {
        userId: { in: [...userIds] },
        idempotencyKey: {
          startsWith: 'friend_milestone:',
        },
        createdAt: { gte: since },
      },
      select: { userId: true, idempotencyKey: true },
    });
    for (const row of inbox) {
      if (!row.idempotencyKey) {
        continue;
      }
      for (const dayKey of dayKeys) {
        if (row.idempotencyKey.includes(`:${dayKey}`)) {
          nudgedToday.add(row.userId);
        }
      }
    }

    return userIds.filter((userId) => !nudgedToday.has(userId));
  }

  private async recentlyActiveUserIds(
    userIds: readonly string[],
    now: Date,
  ): Promise<Set<string>> {
    const since = new Date(now.getTime() - FRIEND_MILESTONE_INACTIVE_MS);
    const [activeEvents, completions] = await Promise.all([
      this.prisma.analyticsEvent.findMany({
        where: {
          name: 'user_active',
          userId: { in: [...userIds] },
          occurredAt: { gte: since },
        },
        select: { userId: true },
        distinct: ['userId'],
      }),
      this.prisma.userChallenge.findMany({
        where: {
          userId: { in: [...userIds] },
          status: 'completed',
          completedAt: { gte: since },
          frequency: 'daily',
        },
        select: { userId: true },
        distinct: ['userId'],
      }),
    ]);

    const active = new Set<string>();
    for (const row of activeEvents) {
      if (row.userId) {
        active.add(row.userId);
      }
    }
    for (const row of completions) {
      active.add(row.userId);
    }
    return active;
  }

  private milestoneKey(
    recipientId: string,
    actorId: string,
    milestoneKey: string,
    dayKey: string,
  ): string {
    return `friend_milestone:${recipientId}:${actorId}:${milestoneKey}:${dayKey}`;
  }
}
