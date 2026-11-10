import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@product/db';
import { dayKeyFor, localMinuteOfDay } from '../../../../shared/utils/day-key.js';
import { PRISMA } from '../../database/prisma.tokens.js';
import { ENGAGEMENT_HOLDOUT_VARIANT_HOLDOUT } from '../constants/engagement-holdout.js';
import { HOLDOUT_HABIT_SLOT_MINUTES, LEAD_COMPLETION_LOOKBACK_DAYS } from './constants.js';
import {
  moreOpenSuffix,
  pickLeadChallenge,
  type LeadChallengeCandidate,
} from './pick-lead-challenge.js';

export type CadencePlan = {
  /** Always holdout — cadence treatment caps were retired. */
  variantKey: 'holdout' | 'treatment' | null;
  habitMinutes: readonly number[];
  /** Always Infinity — cadence sources are never capped. */
  remainingBudget: number;
  /** Always false — in-app activity does not suppress habit slots. */
  skipHabitForActivity: boolean;
  /** Always false — quiet hours do not suppress cadence pushes. */
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

/**
 * Cadence scheduling for habit slots, clock reminders, and in-progress nudges.
 * Burst control for group board moves lives in group-board-push-policy — not here.
 * Cadence treatment caps (daily budget, quiet hours, fewer slots, skip-if-active)
 * were retired; every member gets the original six-slot schedule.
 */
@Injectable()
export class EngagementPolicyService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

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

    for (const userId of uniqueUserIds) {
      const timeZone = timeZoneByUser.get(userId) ?? 'UTC';
      result.set(userId, {
        variantKey: ENGAGEMENT_HOLDOUT_VARIANT_HOLDOUT,
        habitMinutes: HOLDOUT_HABIT_SLOT_MINUTES,
        remainingBudget: Number.POSITIVE_INFINITY,
        skipHabitForActivity: false,
        quietNow: false,
        timeZone,
        dayKey: dayKeyFor(timeZone, now),
        localMinute: localMinuteOfDay(timeZone, now),
      });
    }

    return result;
  }

  /**
   * Rank open challenges for a habit push when several are open.
   * Callers that only need single-open behaviour can skip this.
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
}
