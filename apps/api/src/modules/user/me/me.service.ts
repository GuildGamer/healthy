import { Inject, Injectable } from '@nestjs/common';
import { ORPCError } from '@orpc/server';
import { normalizeCountryCode } from '@product/contract';
import type { HealthCategory, PrismaClient } from '@product/db';
import { MINUTES_PER_DAY } from '../../../shared/constants/reminder-defaults.js';
import { maxRemindersForMembership } from '../../../shared/membership/entitlements.js';
import { effectiveMembershipActive } from '../../../shared/membership/testing-membership.js';
import { type AuthenticatedUser, requireUser } from '../../../shared/types/authenticated-user.js';
import {
  DEFAULT_TIME_ZONE,
  dayKeyFor,
  isValidTimeZone,
} from '../../../shared/utils/day-key.js';
import { longestConsecutiveDayRun } from '../../../shared/utils/day-run.js';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import { EnrollmentsService } from '../enrollments/enrollments.service.js';
import { publicNameFor } from '../leaderboard/pseudonym.js';
import { streakStatusFor } from '../streak/index.js';
import type { MeDto } from './dto/index.js';

@Injectable()
export class MeService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly enrollments: EnrollmentsService,
  ) {}

  async getMe(currentUser: AuthenticatedUser | null | undefined): Promise<MeDto> {
    const user = requireUser(currentUser);

    const profile = await this.prisma.userProfile.findUnique({
      where: { userId: user.id },
      select: {
        healthCategories: true,
        pointsBalance: true,
        currentStreakDays: true,
        bestStreakDays: true,
        lastActiveDayKey: true,
        timeZone: true,
        countryCode: true,
        displayName: true,
        reminderEnabled: true,
        reminderMinute: true,
        evidenceRemindersEnabled: true,
        promotionalMessagesEnabled: true,
        showOnLeaderboard: true,
        groupNotificationsEnabled: true,
        inProgressNudgeEnabled: true,
        inProgressNudgeDelayMinutes: true,
        healthLinkStatus: true,
        membershipActive: true,
        proofClipAudience: true,
      },
    });

    const timeZone = profile?.timeZone ?? DEFAULT_TIME_ZONE;
    const membershipActive = effectiveMembershipActive(profile?.membershipActive);
    const streak = streakStatusFor({
      storedStreakDays: profile?.currentStreakDays ?? 0,
      lastActiveDayKey: profile?.lastActiveDayKey ?? null,
      todayKey: dayKeyFor(timeZone),
    });
    const bestStreakDays = await this.resolvedBestStreakDays(
      user.id,
      profile?.bestStreakDays ?? 0,
      streak.currentStreakDays,
    );

    return {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      categories: profile?.healthCategories ?? [],
      pointsBalance: profile?.pointsBalance ?? 0,
      currentStreakDays: streak.currentStreakDays,
      streakLapsedYesterday: streak.streakLapsedYesterday,
      bestStreakDays,
      timeZone,
      countryCode: normalizeCountryCode(profile?.countryCode ?? ''),
      displayName: publicNameFor(user.id, profile?.displayName),
      reminderEnabled: profile?.reminderEnabled ?? false,
      reminderMinute: profile?.reminderMinute ?? 1140,
      evidenceRemindersEnabled: profile?.evidenceRemindersEnabled ?? true,
      promotionalMessagesEnabled: profile?.promotionalMessagesEnabled ?? false,
      showOnLeaderboard: profile?.showOnLeaderboard ?? true,
      groupNotificationsEnabled: profile?.groupNotificationsEnabled ?? true,
      inProgressNudgeEnabled: profile?.inProgressNudgeEnabled ?? true,
      inProgressNudgeDelayMinutes: profile?.inProgressNudgeDelayMinutes ?? 30,
      healthLinkStatus: profile?.healthLinkStatus ?? 'unknown',
      hasMembership: membershipActive,
      maxRemindersPerChallenge: maxRemindersForMembership(membershipActive),
      proofClipAudience: profile?.proofClipAudience ?? null,
    };
  }

  async updateProofClipAudience(
    currentUser: AuthenticatedUser | null | undefined,
    audience: 'anyone' | 'only_me',
  ): Promise<MeDto> {
    const user = requireUser(currentUser);

    await this.prisma.userProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, proofClipAudience: audience },
      update: { proofClipAudience: audience },
    });

    return this.getMe(user);
  }

  async updateHealthLink(
    currentUser: AuthenticatedUser | null | undefined,
    status: 'connected' | 'denied',
  ): Promise<MeDto> {
    const user = requireUser(currentUser);

    await this.prisma.userProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, healthLinkStatus: status },
      update: { healthLinkStatus: status },
    });

    return this.getMe(user);
  }

  async updateCategories(
    currentUser: AuthenticatedUser | null | undefined,
    categories: readonly HealthCategory[],
  ): Promise<MeDto> {
    const user = requireUser(currentUser);

    if (categories.length === 0) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Select at least one health category',
      });
    }

    const uniqueCategories = [...new Set(categories)];

    await this.prisma.userProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        healthCategories: [...uniqueCategories],
      },
      update: {
        healthCategories: [...uniqueCategories],
      },
    });

    // Picking conditions is what gives someone a starter set of challenges;
    // without this a new account would land on an empty home screen.
    await this.enrollments.enrollDefaultsFor(user.id, uniqueCategories);

    return this.getMe(user);
  }

  async updateTimeZone(
    currentUser: AuthenticatedUser | null | undefined,
    timeZone: string,
  ): Promise<MeDto> {
    const user = requireUser(currentUser);

    if (!isValidTimeZone(timeZone)) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Unrecognised time zone',
      });
    }

    await this.prisma.userProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, timeZone },
      update: { timeZone },
    });

    return this.getMe(user);
  }

  async updateCountry(
    currentUser: AuthenticatedUser | null | undefined,
    countryCode: string,
  ): Promise<MeDto> {
    const user = requireUser(currentUser);
    const normalized = normalizeCountryCode(countryCode);

    if (!normalized) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Unrecognised country',
      });
    }

    await this.prisma.userProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, countryCode: normalized },
      update: { countryCode: normalized },
    });

    return this.getMe(user);
  }

  async updateDisplayName(
    currentUser: AuthenticatedUser | null | undefined,
    displayName: string,
  ): Promise<MeDto> {
    const user = requireUser(currentUser);
    const trimmed = displayName.trim();

    if (trimmed.length === 0) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Display name cannot be blank',
      });
    }

    await this.prisma.userProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, displayName: trimmed },
      update: { displayName: trimmed },
    });

    return this.getMe(user);
  }

  async updateReminder(
    currentUser: AuthenticatedUser | null | undefined,
    enabled: boolean,
    reminderMinute: number,
  ): Promise<MeDto> {
    const user = requireUser(currentUser);

    const isWholeMinuteOfDay =
      Number.isInteger(reminderMinute) && reminderMinute >= 0 && reminderMinute < MINUTES_PER_DAY;

    if (!isWholeMinuteOfDay) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Reminder time must be a minute within the day',
      });
    }

    await this.prisma.userProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, reminderEnabled: enabled, reminderMinute },
      update: { reminderEnabled: enabled, reminderMinute },
    });

    return this.getMe(user);
  }

  async updateNotificationSettings(
    currentUser: AuthenticatedUser | null | undefined,
    settings: {
      reminderEnabled: boolean;
      evidenceRemindersEnabled: boolean;
      promotionalMessagesEnabled: boolean;
      showOnLeaderboard: boolean;
      groupNotificationsEnabled?: boolean;
      inProgressNudgeEnabled: boolean;
      inProgressNudgeDelayMinutes: number;
    },
  ): Promise<MeDto> {
    const user = requireUser(currentUser);

    if (settings.inProgressNudgeEnabled) {
      const profile = await this.prisma.userProfile.findUnique({
        where: { userId: user.id },
        select: { membershipActive: true },
      });

      if (!effectiveMembershipActive(profile?.membershipActive)) {
        throw new ORPCError('FORBIDDEN', {
          message: 'Membership is required for finish-what-you-started nudges',
          data: { reason: 'membership_required' },
        });
      }
    }

    await this.prisma.userProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        reminderEnabled: settings.reminderEnabled,
        evidenceRemindersEnabled: settings.evidenceRemindersEnabled,
        promotionalMessagesEnabled: settings.promotionalMessagesEnabled,
        showOnLeaderboard: settings.showOnLeaderboard,
        groupNotificationsEnabled: settings.groupNotificationsEnabled,
        inProgressNudgeEnabled: settings.inProgressNudgeEnabled,
        inProgressNudgeDelayMinutes: settings.inProgressNudgeDelayMinutes,
      },
      update: {
        reminderEnabled: settings.reminderEnabled,
        evidenceRemindersEnabled: settings.evidenceRemindersEnabled,
        promotionalMessagesEnabled: settings.promotionalMessagesEnabled,
        showOnLeaderboard: settings.showOnLeaderboard,
        groupNotificationsEnabled: settings.groupNotificationsEnabled,
        inProgressNudgeEnabled: settings.inProgressNudgeEnabled,
        inProgressNudgeDelayMinutes: settings.inProgressNudgeDelayMinutes,
      },
    });

    return this.getMe(user);
  }

  /**
   * Prefer the persisted record. When it is still zero (pre-column installs),
   * scan history once, store the result, and never scan again for that user.
   * Rewarded daily completions were the only streak signal before every
   * activity counted, so that is all the history scan needs.
   */
  private async resolvedBestStreakDays(
    userId: string,
    storedBest: number,
    currentStreakDays: number,
  ): Promise<number> {
    if (storedBest > 0) {
      return Math.max(storedBest, currentStreakDays);
    }

    const computed = await this.longestRewardedDailyRun(userId);
    const bestStreakDays = Math.max(computed, currentStreakDays);
    if (bestStreakDays > 0) {
      await this.prisma.userProfile.update({
        where: { userId },
        data: { bestStreakDays },
      });
    }

    return bestStreakDays;
  }

  /**
   * Derived from history for the one-shot backfill. A penalized day never
   * extended a streak; legacy rows with no outcome did.
   */
  private async longestRewardedDailyRun(userId: string): Promise<number> {
    const days = await this.prisma.userChallenge.findMany({
      where: {
        userId,
        frequency: 'daily',
        status: 'completed',
        OR: [{ completionOutcome: null }, { completionOutcome: 'rewarded' }],
      },
      distinct: ['periodKey'],
      select: { periodKey: true },
    });

    return longestConsecutiveDayRun(days.map((day) => day.periodKey));
  }
}
