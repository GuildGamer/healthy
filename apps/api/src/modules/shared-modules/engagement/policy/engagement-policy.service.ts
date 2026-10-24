import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@product/db';
import { dayKeyFor, localMinuteOfDay } from '../../../../shared/utils/day-key.js';
import { PRISMA } from '../../database/prisma.tokens.js';
import {
  ENGAGEMENT_HOLDOUT_VARIANT_HOLDOUT,
  ENGAGEMENT_HOLDOUT_VARIANT_TREATMENT,
} from '../constants/engagement-holdout.js';
import { EngagementHoldoutService } from '../engagement-holdout.service.js';
import {
  CADENCE_DAILY_BUDGET,
  CADENCE_ENGAGEMENT_SOURCES,
  LEAD_COMPLETION_LOOKBACK_DAYS,
  RECENT_ACTIVITY_LOOKBACK_MS,
} from './constants.js';
import { habitSlotMinutesFor, isTreatmentVariant } from './habit-slot-minutes-for.js';
import { isQuietLocalMinute } from './is-quiet-local-minute.js';
import {
  moreOpenSuffix,
  pickLeadChallenge,
  type LeadChallengeCandidate,
} from './pick-lead-challenge.js';

export type CadencePlan = {
  variantKey: 'holdout' | 'treatment' | null;
  habitMinutes: readonly number[];
  /** Infinity for holdout / unassigned — no new daily cap. */
  remainingBudget: number;
  skipHabitForActivity: boolean;
  quietNow: boolean;
  timeZone: string;
  dayKey: string;
  localMinute: number;
};

export type LeadChallengeInput = {
  userId: string;
  openChallengeIds: readonly string[];
  timeZone: string;
  now: Date;
};

@Injectable()
export class EngagementPolicyService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly holdout: EngagementHoldoutService,
  ) {}

  async cadencePlanFor(
    userIds: readonly string[],
    now: Date = new Date(),
  ): Promise<Map<string, CadencePlan>> {
    const uniqueUserIds = [...new Set(userIds)];
    const result = new Map<string, CadencePlan>();

    if (uniqueUserIds.length === 0) {
      return result;
    }

    const profiles = await this.prisma.userProfile.findMany({
      where: { userId: { in: uniqueUserIds } },
      select: { userId: true, timeZone: true },
    });
    const timeZoneByUser = new Map(
      profiles.map((profile) => [profile.userId, profile.timeZone]),
    );

    const [assignments, spentByUser, recentlyActive] = await Promise.all([
      this.holdout.assignmentsFor(uniqueUserIds),
      this.cadenceSendsTodayByUser(uniqueUserIds, timeZoneByUser, now),
      this.recentlyActiveUserIds(uniqueUserIds, now),
    ]);

    for (const userId of uniqueUserIds) {
      const timeZone = timeZoneByUser.get(userId) ?? 'UTC';
      const assignment = assignments.get(userId);
      const rawVariant = assignment?.variantKey ?? null;
      const variantKey =
        rawVariant === ENGAGEMENT_HOLDOUT_VARIANT_TREATMENT
          ? ENGAGEMENT_HOLDOUT_VARIANT_TREATMENT
          : rawVariant === ENGAGEMENT_HOLDOUT_VARIANT_HOLDOUT
            ? ENGAGEMENT_HOLDOUT_VARIANT_HOLDOUT
            : null;
      const treatment = isTreatmentVariant(variantKey);
      const localMinute = localMinuteOfDay(timeZone, now);
      const dayKey = dayKeyFor(timeZone, now);
      const spent = spentByUser.get(userId) ?? 0;

      result.set(userId, {
        variantKey,
        habitMinutes: habitSlotMinutesFor(variantKey),
        remainingBudget: treatment
          ? Math.max(0, CADENCE_DAILY_BUDGET - spent)
          : Number.POSITIVE_INFINITY,
        skipHabitForActivity: treatment && recentlyActive.has(userId),
        quietNow: treatment && isQuietLocalMinute(localMinute),
        timeZone,
        dayKey,
        localMinute,
      });
    }

    return result;
  }

  /**
   * Rank open challenges for a treatment habit push. Holdout callers can skip
   * this and keep the single-open-only challengeId behaviour.
   */
  async pickLeadForOpenChallenges(
    input: LeadChallengeInput,
  ): Promise<{ leadChallengeId: string | null; bodySuffix: string }> {
    const openCount = input.openChallengeIds.length;
    const bodySuffix = moreOpenSuffix(openCount);

    if (openCount === 0) {
      return { leadChallengeId: null, bodySuffix: '' };
    }

    if (openCount === 1) {
      return {
        leadChallengeId: input.openChallengeIds[0] ?? null,
        bodySuffix: '',
      };
    }

    const challenges = await this.prisma.challenge.findMany({
      where: { id: { in: [...input.openChallengeIds] } },
      select: {
        id: true,
        captureKind: true,
        rewardPoints: true,
      },
    });

    const lookbackStart = new Date(
      input.now.getTime() - LEAD_COMPLETION_LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
    );
    const completions = await this.prisma.userChallenge.findMany({
      where: {
        userId: input.userId,
        challengeId: { in: [...input.openChallengeIds] },
        status: 'completed',
        completedAt: { gte: lookbackStart, not: null },
      },
      select: { challengeId: true, completedAt: true },
    });

    const targetHour = Math.floor(
      localMinuteOfDay(input.timeZone, input.now) / 60,
    );
    const hourlyCounts = new Map<string, number>();

    for (const row of completions) {
      if (!row.completedAt) {
        continue;
      }

      const hour = Math.floor(
        localMinuteOfDay(input.timeZone, row.completedAt) / 60,
      );
      if (hour !== targetHour) {
        continue;
      }

      hourlyCounts.set(
        row.challengeId,
        (hourlyCounts.get(row.challengeId) ?? 0) + 1,
      );
    }

    const candidates: LeadChallengeCandidate[] = challenges.map(
      (challenge) => ({
        challengeId: challenge.id,
        captureKind: challenge.captureKind,
        rewardPoints: challenge.rewardPoints,
        completionsInLocalHour: hourlyCounts.get(challenge.id) ?? 0,
      }),
    );

    return {
      leadChallengeId: pickLeadChallenge(candidates),
      bodySuffix,
    };
  }

  private async cadenceSendsTodayByUser(
    userIds: readonly string[],
    timeZoneByUser: Map<string, string>,
    now: Date,
  ): Promise<Map<string, number>> {
    const since = new Date(now.getTime() - 36 * 60 * 60 * 1000);
    const rows = await this.prisma.engagementDelivery.findMany({
      where: {
        userId: { in: [...userIds] },
        source: { in: [...CADENCE_ENGAGEMENT_SOURCES] },
        sentAt: { gte: since },
      },
      select: { userId: true, sentAt: true },
    });

    const counts = new Map<string, number>();

    for (const row of rows) {
      const timeZone = timeZoneByUser.get(row.userId) ?? 'UTC';
      if (dayKeyFor(timeZone, row.sentAt) !== dayKeyFor(timeZone, now)) {
        continue;
      }

      counts.set(row.userId, (counts.get(row.userId) ?? 0) + 1);
    }

    return counts;
  }

  private async recentlyActiveUserIds(
    userIds: readonly string[],
    now: Date,
  ): Promise<Set<string>> {
    const since = new Date(now.getTime() - RECENT_ACTIVITY_LOOKBACK_MS);
    const rows = await this.prisma.analyticsEvent.findMany({
      where: {
        name: 'user_active',
        userId: { in: [...userIds] },
        occurredAt: { gte: since },
      },
      select: { userId: true },
      distinct: ['userId'],
    });

    return new Set(
      rows
        .map((row) => row.userId)
        .filter((userId): userId is string => userId != null),
    );
  }
}
