import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type { PrismaClient } from '@product/db';
import { dayKeyFor } from '../../../shared/utils/day-key.js';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import {
  FriendMilestoneNotifierService,
  friendStreakMilestoneKey,
  isFriendStreakMilestone,
} from '../friend-milestones/index.js';
import { advancedStreakDays, laterDayKey } from './streak-days.js';
import type { StreakAdvance, StreakClient } from './types/streak.js';

/**
 * One streak for everything a member logs: challenge completions, contest
 * sets and practice sessions all count the day. Points stay with challenges.
 */
@Injectable()
export class StreakService {
  private readonly logger = new Logger(StreakService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Optional()
    private readonly friendMilestones?: FriendMilestoneNotifierService,
  ) {}

  /**
   * Counts today, in the member's own zone. Safe to retry and to call once
   * per activity: only the first activity of a day moves the streak.
   * Pass the open transaction when the activity is written inside one.
   */
  async recordActiveDay(
    userId: string,
    client: StreakClient = this.prisma,
    at: Date = new Date(),
  ): Promise<StreakAdvance> {
    const profile = await client.userProfile.upsert({
      where: { userId },
      create: { userId },
      update: {},
      select: {
        currentStreakDays: true,
        bestStreakDays: true,
        lastActiveDayKey: true,
        timeZone: true,
      },
    });

    const todayKey = dayKeyFor(profile.timeZone, at);
    const currentStreakDays = advancedStreakDays({
      storedStreakDays: profile.currentStreakDays,
      lastActiveDayKey: profile.lastActiveDayKey,
      todayKey,
    });
    const lastActiveDayKey = laterDayKey(profile.lastActiveDayKey, todayKey);

    const unchanged =
      currentStreakDays === profile.currentStreakDays &&
      lastActiveDayKey === profile.lastActiveDayKey;
    if (unchanged) {
      return { currentStreakDays, advanced: false };
    }

    await client.userProfile.update({
      where: { userId },
      data: {
        currentStreakDays,
        bestStreakDays: Math.max(profile.bestStreakDays, currentStreakDays),
        lastActiveDayKey,
      },
    });

    return { currentStreakDays, advanced: true };
  }

  /**
   * Rare streak gates only, and only on the day the streak reached them.
   * Call after the activity is committed; a failed nudge never undoes it.
   */
  async announceMilestone(userId: string, advance: StreakAdvance): Promise<void> {
    const { advanced, currentStreakDays } = advance;
    if (!this.friendMilestones || !advanced) {
      return;
    }

    if (!isFriendStreakMilestone(currentStreakDays)) {
      return;
    }

    try {
      await this.friendMilestones.notifyAcquaintances({
        actorUserId: userId,
        milestoneKey: friendStreakMilestoneKey(currentStreakDays),
      });
    } catch (error) {
      this.logger.error(`Could not notify acquaintances of streak ${currentStreakDays}`, error);
    }
  }
}
