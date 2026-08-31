import { Inject, Injectable } from '@nestjs/common';
import type {
  AdminAnalyticsRangeInput,
  AdminCatalogAnalytics,
  AdminEngagementAnalytics,
  AdminGrowthAnalytics,
  AdminMarketsAnalytics,
  AdminOverviewAnalytics,
  AdminRemindersAnalytics,
} from '@product/contract';
import type { PrismaClient } from '@product/db';
import {
  type AuthenticatedAdmin,
  requireAdmin,
} from '../../../shared/types/authenticated-admin.js';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import {
  bucketByDay,
  countryShares,
  rate,
  resolveRange,
  streakBucketKey,
} from './analytics.helpers.js';

@Injectable()
export class AdminAnalyticsService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async overview(
    currentAdmin: AuthenticatedAdmin | null | undefined,
    input: AdminAnalyticsRangeInput,
  ): Promise<AdminOverviewAnalytics> {
    requireAdmin(currentAdmin);
    const { days, rangeStart, weekStart, now } = resolveRange(input.days);

    const [
      membersTotal,
      membersActive,
      wauCompleters,
      signups7d,
      signupsInRange,
      completionsInRange,
      occurrencesInRange,
      waitlistInRange,
      profiles,
      signupRows,
      completionRows,
    ] = await Promise.all([
      this.prisma.userProfile.count(),
      this.prisma.userProfile.count({ where: { deactivatedAt: null } }),
      this.distinctCompletersSince(weekStart),
      this.prisma.user.count({ where: { createdAt: { gte: weekStart } } }),
      this.prisma.user.count({ where: { createdAt: { gte: rangeStart } } }),
      this.prisma.userChallenge.count({
        where: { completedAt: { gte: rangeStart } },
      }),
      this.prisma.userChallenge.count({
        where: { createdAt: { gte: rangeStart } },
      }),
      this.prisma.waitlistEntry.count({
        where: { createdAt: { gte: rangeStart } },
      }),
      this.prisma.userProfile.findMany({
        where: { deactivatedAt: null },
        select: { countryCode: true, healthCategories: true },
      }),
      this.prisma.user.findMany({
        where: { createdAt: { gte: rangeStart } },
        select: { createdAt: true },
      }),
      this.prisma.userChallenge.findMany({
        where: { completedAt: { gte: rangeStart } },
        select: { completedAt: true },
      }),
    ]);

    const withCountry = profiles.filter((row) => row.countryCode != null).length;
    const activated = profiles.filter(
      (row) => row.healthCategories.length > 0,
    ).length;

    return {
      generatedAt: now.toISOString(),
      rangeDays: days,
      membersActive,
      membersTotal,
      wauCompleters,
      signups7d,
      signupsInRange,
      completionsInRange,
      occurrencesInRange,
      completionRateInRange: rate(completionsInRange, occurrencesInRange),
      waitlistInRange,
      countryCaptureRate: rate(withCountry, profiles.length),
      activationRate: rate(activated, profiles.length),
      topCountries: countryShares(
        profiles.map((row) => row.countryCode),
      ).slice(0, 5),
      sparklineSignups: bucketByDay(
        signupRows.map((row) => row.createdAt),
        rangeStart,
        days,
      ),
      sparklineCompletions: bucketByDay(
        completionRows
          .map((row) => row.completedAt)
          .filter((value): value is Date => value != null),
        rangeStart,
        days,
      ),
    };
  }

  async markets(
    currentAdmin: AuthenticatedAdmin | null | undefined,
    input: AdminAnalyticsRangeInput,
  ): Promise<AdminMarketsAnalytics> {
    requireAdmin(currentAdmin);
    const { days, rangeStart, now } = resolveRange(input.days);

    const [profiles, signupProfiles] = await Promise.all([
      this.prisma.userProfile.findMany({
        where: { deactivatedAt: null },
        select: { countryCode: true, healthCategories: true },
      }),
      this.prisma.user.findMany({
        where: { createdAt: { gte: rangeStart } },
        select: {
          profile: { select: { countryCode: true } },
        },
      }),
    ]);

    const categoryCounts = new Map<string, number>();
    for (const profile of profiles) {
      for (const category of profile.healthCategories) {
        categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
      }
    }
    const categoryTotal = [...categoryCounts.values()].reduce(
      (sum, value) => sum + value,
      0,
    );

    return {
      generatedAt: now.toISOString(),
      rangeDays: days,
      membersActive: profiles.length,
      unknownCountry: profiles.filter((row) => row.countryCode == null).length,
      countries: countryShares(profiles.map((row) => row.countryCode)),
      signupsByCountryInRange: countryShares(
        signupProfiles.map((row) => row.profile?.countryCode ?? null),
      ),
      categoryMix: [...categoryCounts.entries()]
        .map(([category, members]) => ({
          category: category as AdminMarketsAnalytics['categoryMix'][number]['category'],
          members,
          share: rate(members, categoryTotal),
        }))
        .sort((left, right) => right.members - left.members),
    };
  }

  async growth(
    currentAdmin: AuthenticatedAdmin | null | undefined,
    input: AdminAnalyticsRangeInput,
  ): Promise<AdminGrowthAnalytics> {
    requireAdmin(currentAdmin);
    const { days, rangeStart, now } = resolveRange(input.days);

    const [
      waitlistTotal,
      waitlistInRange,
      waitlistRows,
      signupRows,
      verifiedInRange,
      profiles,
      activatedUsers,
    ] = await Promise.all([
      this.prisma.waitlistEntry.count(),
      this.prisma.waitlistEntry.count({
        where: { createdAt: { gte: rangeStart } },
      }),
      this.prisma.waitlistEntry.findMany({
        where: { createdAt: { gte: rangeStart } },
        select: { source: true },
      }),
      this.prisma.user.findMany({
        where: { createdAt: { gte: rangeStart } },
        select: { createdAt: true },
      }),
      this.prisma.user.count({
        where: { createdAt: { gte: rangeStart }, emailVerified: true },
      }),
      this.prisma.userProfile.findMany({
        where: { deactivatedAt: null },
        select: { countryCode: true, healthCategories: true },
      }),
      this.prisma.userChallenge.findMany({
        where: {
          completedAt: { gte: rangeStart },
        },
        select: { userId: true },
        distinct: ['userId'],
      }),
    ]);

    const sourceCounts = new Map<string, number>();
    for (const row of waitlistRows) {
      const key = row.source?.trim() || 'unknown';
      sourceCounts.set(key, (sourceCounts.get(key) ?? 0) + 1);
    }

    const withCountry = profiles.filter((row) => row.countryCode != null).length;
    const activated = profiles.filter(
      (row) => row.healthCategories.length > 0,
    ).length;

    return {
      generatedAt: now.toISOString(),
      rangeDays: days,
      waitlistTotal,
      waitlistInRange,
      waitlistBySource: [...sourceCounts.entries()]
        .map(([key, count]) => ({ key, label: key, count }))
        .sort((left, right) => right.count - left.count),
      signupsInRange: signupRows.length,
      signupsByDay: bucketByDay(
        signupRows.map((row) => row.createdAt),
        rangeStart,
        days,
      ),
      verifiedInRange,
      activationRate: rate(activated, profiles.length),
      countryCaptureRate: rate(withCountry, profiles.length),
      activatedInRange: activatedUsers.length,
    };
  }

  async engagement(
    currentAdmin: AuthenticatedAdmin | null | undefined,
    input: AdminAnalyticsRangeInput,
  ): Promise<AdminEngagementAnalytics> {
    requireAdmin(currentAdmin);
    const { days, rangeStart, weekStart, now } = resolveRange(input.days);

    const [
      wauCompleters,
      completerRows,
      completionsInRange,
      occurrencesInRange,
      openRows,
      streakRows,
      enrollmentAgg,
      completionWithChallenge,
      leaderboardOptIn,
      membersActive,
    ] = await Promise.all([
      this.distinctCompletersSince(weekStart),
      this.prisma.userChallenge.findMany({
        where: { completedAt: { gte: rangeStart } },
        select: { userId: true },
        distinct: ['userId'],
      }),
      this.prisma.userChallenge.count({
        where: { completedAt: { gte: rangeStart } },
      }),
      this.prisma.userChallenge.count({
        where: { createdAt: { gte: rangeStart } },
      }),
      this.prisma.userChallenge.groupBy({
        by: ['status'],
        where: { status: { not: 'completed' } },
        _count: { _all: true },
      }),
      this.prisma.userProfile.findMany({
        where: { deactivatedAt: null },
        select: { currentStreakDays: true },
      }),
      this.prisma.challengeEnrollment.groupBy({
        by: ['userId'],
        where: { isActive: true },
        _count: { _all: true },
      }),
      this.prisma.userChallenge.findMany({
        where: { completedAt: { gte: rangeStart } },
        select: {
          frequency: true,
          challenge: { select: { category: true, captureKind: true } },
        },
      }),
      this.prisma.userProfile.count({
        where: { deactivatedAt: null, showOnLeaderboard: true },
      }),
      this.prisma.userProfile.count({ where: { deactivatedAt: null } }),
    ]);

    const streakMap = new Map<string, number>();
    for (const row of streakRows) {
      const key = streakBucketKey(row.currentStreakDays);
      streakMap.set(key, (streakMap.get(key) ?? 0) + 1);
    }

    const enrollmentTotal = enrollmentAgg.reduce(
      (sum, row) => sum + row._count._all,
      0,
    );

    const captureMap = new Map<string, number>();
    const frequencyMap = new Map<string, number>();
    const categoryOcc = new Map<string, { completions: number; occurrences: number }>();

    for (const row of completionWithChallenge) {
      const capture = row.challenge.captureKind;
      captureMap.set(capture, (captureMap.get(capture) ?? 0) + 1);
      frequencyMap.set(
        row.frequency,
        (frequencyMap.get(row.frequency) ?? 0) + 1,
      );
      const category = row.challenge.category;
      const current = categoryOcc.get(category) ?? {
        completions: 0,
        occurrences: 0,
      };
      current.completions += 1;
      categoryOcc.set(category, current);
    }

    const occurrenceByCategory = await this.prisma.userChallenge.findMany({
      where: { createdAt: { gte: rangeStart } },
      select: { challenge: { select: { category: true } } },
    });
    for (const row of occurrenceByCategory) {
      const category = row.challenge.category;
      const current = categoryOcc.get(category) ?? {
        completions: 0,
        occurrences: 0,
      };
      current.occurrences += 1;
      categoryOcc.set(category, current);
    }

    return {
      generatedAt: now.toISOString(),
      rangeDays: days,
      wauCompleters,
      completersInRange: completerRows.length,
      completionsInRange,
      occurrencesInRange,
      completionRateInRange: rate(completionsInRange, occurrencesInRange),
      statusBreakdown: [
        ...openRows.map((row) => ({
          status: row.status,
          count: row._count._all,
        })),
        { status: 'completed' as const, count: completionsInRange },
      ],
      streakBuckets: ['0', '1–3', '4–7', '8–30', '31+'].map((label) => ({
        key: label,
        label,
        count: streakMap.get(label) ?? 0,
      })),
      averageActiveEnrollments:
        enrollmentAgg.length === 0
          ? 0
          : Math.round((enrollmentTotal / enrollmentAgg.length) * 10) / 10,
      captureKindBreakdown: [...captureMap.entries()].map(
        ([captureKind, completions]) => ({
          captureKind:
            captureKind as AdminEngagementAnalytics['captureKindBreakdown'][number]['captureKind'],
          completions,
        }),
      ),
      categoryCompletions: [...categoryOcc.entries()]
        .map(([category, stats]) => ({
          category:
            category as AdminEngagementAnalytics['categoryCompletions'][number]['category'],
          completions: stats.completions,
          occurrences: stats.occurrences,
          completionRate: rate(stats.completions, stats.occurrences),
        }))
        .sort((left, right) => right.completions - left.completions),
      frequencyBreakdown: [...frequencyMap.entries()].map(
        ([frequency, completions]) => ({
          frequency:
            frequency as AdminEngagementAnalytics['frequencyBreakdown'][number]['frequency'],
          completions,
        }),
      ),
      leaderboardOptInRate: rate(leaderboardOptIn, membersActive),
    };
  }

  async catalog(
    currentAdmin: AuthenticatedAdmin | null | undefined,
    input: AdminAnalyticsRangeInput,
  ): Promise<AdminCatalogAnalytics> {
    requireAdmin(currentAdmin);
    const { days, rangeStart, now } = resolveRange(input.days);

    const challenges = await this.prisma.challenge.findMany({
      orderBy: [{ category: 'asc' }, { title: 'asc' }],
      include: {
        _count: {
          select: {
            enrollments: { where: { isActive: true } },
          },
        },
        assignments: {
          where: { createdAt: { gte: rangeStart } },
          select: { status: true, completedAt: true },
        },
      },
    });

    return {
      generatedAt: now.toISOString(),
      rangeDays: days,
      challenges: challenges.map((challenge) => {
        const occurrencesInRange = challenge.assignments.length;
        const completionsInRange = challenge.assignments.filter(
          (row) => row.completedAt != null || row.status === 'completed',
        ).length;
        return {
          challengeId: challenge.id,
          slug: challenge.slug,
          title: challenge.title,
          category: challenge.category,
          isDefault: challenge.isDefault,
          isActive: challenge.isActive,
          activeEnrollments: challenge._count.enrollments,
          completionsInRange,
          occurrencesInRange,
          completionRateInRange: rate(completionsInRange, occurrencesInRange),
        };
      }),
    };
  }

  async reminders(
    currentAdmin: AuthenticatedAdmin | null | undefined,
    input: AdminAnalyticsRangeInput,
  ): Promise<AdminRemindersAnalytics> {
    requireAdmin(currentAdmin);
    const { days, rangeStart, now } = resolveRange(input.days);

    const [
      activeEnrollments,
      enrollmentsWithReminder,
      deliveriesInRange,
      pushDevices,
      notifications,
      surpriseRows,
    ] = await Promise.all([
      this.prisma.challengeEnrollment.count({ where: { isActive: true } }),
      this.prisma.challengeEnrollment.count({
        where: { isActive: true, reminders: { some: {} } },
      }),
      this.prisma.reminderDelivery.count({
        where: { sentAt: { gte: rangeStart } },
      }),
      this.prisma.pushDevice.findMany({
        where: { isActive: true },
        select: { platform: true },
      }),
      this.prisma.notification.findMany({
        where: { createdAt: { gte: rangeStart } },
        select: { readAt: true },
      }),
      this.prisma.surpriseEvidenceRequest.groupBy({
        by: ['status'],
        where: { createdAt: { gte: rangeStart } },
        _count: { _all: true },
      }),
    ]);

    const platformMap = new Map<string, number>();
    for (const device of pushDevices) {
      const key = device.platform || 'unknown';
      platformMap.set(key, (platformMap.get(key) ?? 0) + 1);
    }

    const readCount = notifications.filter((row) => row.readAt != null).length;

    return {
      generatedAt: now.toISOString(),
      rangeDays: days,
      activeEnrollments,
      enrollmentsWithReminder,
      reminderCoverage: rate(enrollmentsWithReminder, activeEnrollments),
      deliveriesInRange,
      pushDevicesActive: pushDevices.length,
      pushByPlatform: [...platformMap.entries()]
        .map(([key, count]) => ({ key, label: key, count }))
        .sort((left, right) => right.count - left.count),
      notificationsInRange: notifications.length,
      notificationsReadInRange: readCount,
      notificationReadRate: rate(readCount, notifications.length),
      surpriseEvidenceInRange: surpriseRows.map((row) => ({
        key: row.status,
        label: row.status,
        count: row._count._all,
      })),
    };
  }

  private async distinctCompletersSince(since: Date): Promise<number> {
    const rows = await this.prisma.userChallenge.findMany({
      where: { completedAt: { gte: since } },
      select: { userId: true },
      distinct: ['userId'],
    });
    return rows.length;
  }
}
