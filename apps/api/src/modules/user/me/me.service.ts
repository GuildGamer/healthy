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
  previousDayKey,
} from '../../../shared/utils/day-key.js';
import { longestConsecutiveDayRun } from '../../../shared/utils/day-run.js';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import { EnrollmentsService } from '../enrollments/enrollments.service.js';
import { publicNameFor } from '../leaderboard/pseudonym.js';
import type { MeDto } from './dto/index.js';
import type { StreakStatus } from './types/streak-status.js';

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
    const [streak, longestRunDays] = await Promise.all([
      this.streakStatus(user.id, profile?.currentStreakDays ?? 0, timeZone),
      this.longestRewardedDailyRun(user.id),
    ]);

    return {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      categories: profile?.healthCategories ?? [],
      pointsBalance: profile?.pointsBalance ?? 0,
      currentStreakDays: streak.currentStreakDays,
      streakLapsedYesterday: streak.streakLapsedYesterday,
      bestStreakDays: Math.max(longestRunDays, streak.currentStreakDays),
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
   * `currentStreakDays` is only advanced when a challenge is completed, so a
   * user who stops for a few days would otherwise keep seeing the streak they
   * have already broken. Expire it on read instead of running a nightly job.
   *
   * Only daily completions count, matching how the streak is advanced — a
   * weekly or monthly challenge finished yesterday says nothing about whether
   * a daily habit is still unbroken.
   *
   * A run whose last day was the day before yesterday broke yesterday, which
   * Today mentions once.
   */
  private async streakStatus(
    userId: string,
    storedStreakDays: number,
    timeZone: string,
  ): Promise<StreakStatus> {
    const noStreak: StreakStatus = { currentStreakDays: 0, streakLapsedYesterday: false };
    if (storedStreakDays === 0) {
      return noStreak;
    }

    const latestCompletion = await this.prisma.userChallenge.findFirst({
      where: { userId, status: 'completed', frequency: 'daily' },
      orderBy: { periodKey: 'desc' },
      select: { periodKey: true },
    });

    if (!latestCompletion) {
      return noStreak;
    }

    const today = dayKeyFor(timeZone);
    const yesterday = previousDayKey(today);
    const isLive = latestCompletion.periodKey === today || latestCompletion.periodKey === yesterday;

    if (isLive) {
      return { currentStreakDays: storedStreakDays, streakLapsedYesterday: false };
    }

    return {
      currentStreakDays: 0,
      streakLapsedYesterday: latestCompletion.periodKey === previousDayKey(yesterday),
    };
  }

  /**
   * Derived from history rather than stored, so it is right for runs that
   * ended before anything tracked a record. A penalized day never extended a
   * streak, so it does not extend this one; legacy rows with no outcome did.
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
