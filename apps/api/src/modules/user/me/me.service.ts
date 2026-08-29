import { Inject, Injectable } from '@nestjs/common';
import { ORPCError } from '@orpc/server';
import type { HealthCategory, PrismaClient } from '@product/db';
import { MINUTES_PER_DAY } from '../../../shared/constants/reminder-defaults.js';
import {
  type AuthenticatedUser,
  requireUser,
} from '../../../shared/types/authenticated-user.js';
import {
  DEFAULT_TIME_ZONE,
  dayKeyFor,
  isValidTimeZone,
  previousDayKey,
} from '../../../shared/utils/day-key.js';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import { EnrollmentsService } from '../enrollments/enrollments.service.js';
import { publicNameFor } from '../leaderboard/pseudonym.js';
import type { MeDto } from './dto/index.js';

@Injectable()
export class MeService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly enrollments: EnrollmentsService,
  ) {}

  async getMe(
    currentUser: AuthenticatedUser | null | undefined,
  ): Promise<MeDto> {
    const user = requireUser(currentUser);

    const profile = await this.prisma.userProfile.findUnique({
      where: { userId: user.id },
      select: {
        healthCategories: true,
        pointsBalance: true,
        currentStreakDays: true,
        timeZone: true,
        displayName: true,
        reminderEnabled: true,
        reminderMinute: true,
        evidenceRemindersEnabled: true,
        promotionalMessagesEnabled: true,
        showOnLeaderboard: true,
      },
    });

    const timeZone = profile?.timeZone ?? DEFAULT_TIME_ZONE;

    return {
      id: user.id,
      email: user.email,
      name: user.name ?? null,
      categories: profile?.healthCategories ?? [],
      pointsBalance: profile?.pointsBalance ?? 0,
      currentStreakDays: await this.liveStreak(
        user.id,
        profile?.currentStreakDays ?? 0,
        timeZone,
      ),
      timeZone,
      displayName: publicNameFor(user.id, profile?.displayName),
      reminderEnabled: profile?.reminderEnabled ?? false,
      reminderMinute: profile?.reminderMinute ?? 1140,
      evidenceRemindersEnabled: profile?.evidenceRemindersEnabled ?? true,
      promotionalMessagesEnabled: profile?.promotionalMessagesEnabled ?? false,
      showOnLeaderboard: profile?.showOnLeaderboard ?? true,
    };
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
      Number.isInteger(reminderMinute) &&
      reminderMinute >= 0 &&
      reminderMinute < MINUTES_PER_DAY;

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
    },
  ): Promise<MeDto> {
    const user = requireUser(currentUser);

    await this.prisma.userProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        reminderEnabled: settings.reminderEnabled,
        evidenceRemindersEnabled: settings.evidenceRemindersEnabled,
        promotionalMessagesEnabled: settings.promotionalMessagesEnabled,
        showOnLeaderboard: settings.showOnLeaderboard,
      },
      update: {
        reminderEnabled: settings.reminderEnabled,
        evidenceRemindersEnabled: settings.evidenceRemindersEnabled,
        promotionalMessagesEnabled: settings.promotionalMessagesEnabled,
        showOnLeaderboard: settings.showOnLeaderboard,
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
   */
  private async liveStreak(
    userId: string,
    storedStreakDays: number,
    timeZone: string,
  ): Promise<number> {
    if (storedStreakDays === 0) {
      return 0;
    }

    const latestCompletion = await this.prisma.userChallenge.findFirst({
      where: { userId, status: 'completed', frequency: 'daily' },
      orderBy: { periodKey: 'desc' },
      select: { periodKey: true },
    });

    if (!latestCompletion) {
      return 0;
    }

    const today = dayKeyFor(timeZone);
    const isLive =
      latestCompletion.periodKey === today ||
      latestCompletion.periodKey === previousDayKey(today);

    return isLive ? storedStreakDays : 0;
  }
}
