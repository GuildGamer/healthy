import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { resolveEnrollmentTargetCount } from '@product/contract';
import type { PrismaClient } from '@product/db';
import {
  dayKeyFor,
  previousDayKey,
} from '../../../../shared/utils/day-key.js';
import { PRISMA } from '../../database/prisma.tokens.js';
import { REMINDER_RIVALRY_SOURCE } from '../engagement.tokens.js';
import type {
  ReminderRivalry,
  ReminderRivalrySource,
} from '../types/reminder-rivalry.js';
import { firstNameFromDisplay } from './starter-steps.js';
import type {
  ReminderContext,
  ReminderLeadChallenge,
  ReminderNudgeKind,
} from './types.js';

export type ReminderContextRequest = {
  userId: string;
  dayKey: string;
  localMinute: number;
  timeZone: string;
  nudgeKind: ReminderNudgeKind;
  openChallengeIds: readonly string[];
  leadChallengeId: string | null;
  /** When set (in-progress), use this occurrence for status/draft. */
  userChallengeId?: string | null;
};

const FIRST_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Nudges that may speak for a group. An in-progress nudge stays on its occurrence. */
const RIVALRY_NUDGE_KINDS: ReadonlySet<ReminderNudgeKind> = new Set([
  'habit_slot',
  'clock_reminder',
]);

@Injectable()
export class ReminderContextLoaderService {
  private readonly logger = new Logger(ReminderContextLoaderService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Optional()
    @Inject(REMINDER_RIVALRY_SOURCE)
    private readonly rivalrySource: ReminderRivalrySource | null = null,
  ) {}

  async loadMany(
    requests: readonly ReminderContextRequest[],
    now: Date = new Date(),
  ): Promise<Map<string, ReminderContext>> {
    const result = new Map<string, ReminderContext>();
    if (requests.length === 0) {
      return result;
    }

    const userIds = [...new Set(requests.map((item) => item.userId))];
    const leadIds = [
      ...new Set(
        requests
          .map((item) => item.leadChallengeId)
          .filter((id): id is string => id != null),
      ),
    ];
    const occurrenceIds = [
      ...new Set(
        requests
          .map((item) => item.userChallengeId)
          .filter((id): id is string => id != null && id.length > 0),
      ),
    ];

    const [profiles, enrollments, challenges, occurrences] = await Promise.all([
      this.prisma.userProfile.findMany({
        where: { userId: { in: userIds } },
        select: {
          userId: true,
          displayName: true,
          currentStreakDays: true,
          timeZone: true,
          user: { select: { name: true } },
        },
      }),
      this.prisma.challengeEnrollment.findMany({
        where: {
          userId: { in: userIds },
          isActive: true,
          frequency: 'daily',
          challenge: { isActive: true },
        },
        select: {
          userId: true,
          challengeId: true,
          targetCount: true,
          createdAt: true,
        },
      }),
      leadIds.length === 0
        ? Promise.resolve([])
        : this.prisma.challenge.findMany({
            where: { id: { in: leadIds } },
            select: {
              id: true,
              slug: true,
              title: true,
              deviceMetric: true,
              completionKind: true,
              targetCount: true,
            },
          }),
      occurrenceIds.length === 0
        ? Promise.resolve([])
        : this.prisma.userChallenge.findMany({
            where: { id: { in: occurrenceIds } },
            select: {
              id: true,
              userId: true,
              challengeId: true,
              status: true,
              draft: true,
              periodKey: true,
            },
          }),
    ]);

    const challengeById = new Map(challenges.map((row) => [row.id, row]));
    const occurrenceById = new Map(occurrences.map((row) => [row.id, row]));
    const enrollmentsByUser = groupBy(enrollments, (row) => row.userId);

    const dayKeys = [...new Set(requests.map((item) => item.dayKey))];
    const yesterdayKeys = dayKeys.map((key) => previousDayKey(key));
    const periodKeys = [...new Set([...dayKeys, ...yesterdayKeys])];

    const leadSlugs = [
      ...new Set(challenges.map((row) => row.slug).filter((slug) => slug.length > 0)),
    ];
    const leadActivityKeys = [
      ...new Set(
        challenges
          .map((row) => row.deviceMetric)
          .filter((metric): metric is NonNullable<typeof metric> => metric != null),
      ),
    ];

    const [completed, benefitTips, activityLogs, rivalries] = await Promise.all([
      this.prisma.userChallenge.findMany({
        where: {
          userId: { in: userIds },
          status: 'completed',
          frequency: 'daily',
          periodKey: { in: periodKeys },
        },
        select: { userId: true, challengeId: true, periodKey: true },
      }),
      leadSlugs.length === 0 && leadActivityKeys.length === 0
        ? Promise.resolve([])
        : this.prisma.tip.findMany({
            where: {
              isActive: true,
              OR: [
                ...(leadSlugs.length > 0
                  ? [{ challengeSlug: { in: leadSlugs } }]
                  : []),
                ...(leadActivityKeys.length > 0
                  ? [{ activityKey: { in: leadActivityKeys } }]
                  : []),
              ],
            },
            select: {
              body: true,
              challengeSlug: true,
              activityKey: true,
            },
          }),
      leadActivityKeys.length === 0
        ? Promise.resolve([])
        : this.prisma.deviceActivityLog.findMany({
            where: {
              userId: { in: userIds },
              metric: { in: leadActivityKeys },
              source: { not: 'manual' },
              createdAt: { gte: new Date(now.getTime() - 40 * 60 * 60 * 1000) },
            },
            select: {
              userId: true,
              metric: true,
              count: true,
              endedAt: true,
              createdAt: true,
            },
          }),
      this.loadRivalries(requests, now),
    ]);

    for (const request of requests) {
      const profile = profiles.find((row) => row.userId === request.userId);
      const userEnrollments = enrollmentsByUser.get(request.userId) ?? [];
      const openSet = new Set(request.openChallengeIds);
      const doneToday = completed.filter(
        (row) =>
          row.userId === request.userId && row.periodKey === request.dayKey,
      ).length;

      const yesterdayKey = previousDayKey(request.dayKey);
      const enrolledAsOfYesterday = userEnrollments.filter(
        (row) => dayKeyFor(request.timeZone, row.createdAt) < request.dayKey,
      );
      const completedYesterday = completed.filter(
        (row) =>
          row.userId === request.userId && row.periodKey === yesterdayKey,
      ).length;
      const missedYesterday =
        enrolledAsOfYesterday.length > 0 && completedYesterday === 0;

      const earliestEnrollment = userEnrollments
        .map((row) => row.createdAt.getTime())
        .sort((left, right) => left - right)[0];
      const firstWeek =
        earliestEnrollment != null &&
        now.getTime() - earliestEnrollment <= FIRST_WEEK_MS;

      const lead = this.buildLead({
        request,
        challengeById,
        occurrenceById,
        enrollments: userEnrollments,
        activityLogs,
        timeZone: request.timeZone,
        dayKey: request.dayKey,
      });

      const key = contextKey(request);
      result.set(key, {
        userId: request.userId,
        dayKey: request.dayKey,
        localMinute: request.localMinute,
        nudgeKind: request.nudgeKind,
        firstName: firstNameFromDisplay(
          profile?.displayName ?? profile?.user.name ?? null,
        ),
        streakDays: profile?.currentStreakDays ?? 0,
        openCount: openSet.size > 0 ? openSet.size : request.leadChallengeId ? 1 : 0,
        doneCount: doneToday,
        missedYesterday,
        firstWeek,
        lead,
        benefitBody: benefitBodyForLead(benefitTips, lead),
        rivalry: RIVALRY_NUDGE_KINDS.has(request.nudgeKind)
          ? (rivalries.get(request.userId) ?? null)
          : null,
      });
    }

    return result;
  }

  /**
   * A failed group read must not cost anyone their reminder, so it degrades to
   * solo copy for the whole batch.
   */
  private async loadRivalries(
    requests: readonly ReminderContextRequest[],
    now: Date,
  ): Promise<Map<string, ReminderRivalry>> {
    const rivalryRequests = uniqueByUser(
      requests.filter((request) => RIVALRY_NUDGE_KINDS.has(request.nudgeKind)),
    );
    if (!this.rivalrySource || rivalryRequests.length === 0) {
      return new Map();
    }

    try {
      return await this.rivalrySource.loadMany(
        rivalryRequests.map((request) => ({
          userId: request.userId,
          timeZone: request.timeZone,
        })),
        now,
      );
    } catch (error) {
      this.logger.error('Could not load group rivalries for reminders', error);
      return new Map();
    }
  }

  private buildLead(input: {
    request: ReminderContextRequest;
    challengeById: Map<
      string,
      {
        id: string;
        slug: string;
        title: string;
        deviceMetric: string | null;
        completionKind: string;
        targetCount: number | null;
      }
    >;
    occurrenceById: Map<
      string,
      {
        id: string;
        userId: string;
        challengeId: string;
        status: string;
        draft: unknown;
        periodKey: string;
      }
    >;
    enrollments: Array<{ challengeId: string; targetCount: number | null }>;
    activityLogs: Array<{
      userId: string;
      metric: string;
      count: number | null;
      endedAt: Date | null;
      createdAt: Date;
    }>;
    timeZone: string;
    dayKey: string;
  }): ReminderLeadChallenge | null {
    const leadId = input.request.leadChallengeId;
    if (!leadId) {
      return null;
    }

    const challenge = input.challengeById.get(leadId);
    if (!challenge) {
      return null;
    }

    const enrollment = input.enrollments.find(
      (row) => row.challengeId === leadId,
    );
    const targetCount = resolveEnrollmentTargetCount(
      challenge.targetCount,
      enrollment?.targetCount,
    );

    const occurrence = input.request.userChallengeId
      ? input.occurrenceById.get(input.request.userChallengeId)
      : undefined;

    const measuredFromDraft = measuredCountFromDraft(occurrence?.draft);
    const measuredFromLogs =
      challenge.deviceMetric == null
        ? null
        : maxDeviceCountForDay({
            logs: input.activityLogs,
            userId: input.request.userId,
            metric: challenge.deviceMetric,
            timeZone: input.timeZone,
            dayKey: input.dayKey,
          });

    const measuredCount = measuredFromDraft ?? measuredFromLogs;

    return {
      challengeId: challenge.id,
      slug: challenge.slug,
      title: challenge.title,
      deviceMetric: challenge.deviceMetric,
      completionKind: challenge.completionKind,
      targetCount,
      measuredCount,
      status: (occurrence?.status as ReminderLeadChallenge['status']) ?? null,
    };
  }
}

function benefitBodyForLead(
  tips: readonly {
    body: string;
    challengeSlug: string | null;
    activityKey: string | null;
  }[],
  lead: ReminderLeadChallenge | null,
): string | null {
  if (!lead) {
    return null;
  }

  const bySlug = tips.find((tip) => tip.challengeSlug === lead.slug);
  if (bySlug) {
    return bySlug.body;
  }

  if (!lead.deviceMetric) {
    return null;
  }

  return tips.find((tip) => tip.activityKey === lead.deviceMetric)?.body ?? null;
}

export function contextKey(request: Pick<ReminderContextRequest, 'userId' | 'nudgeKind' | 'leadChallengeId' | 'userChallengeId'>): string {
  return [
    request.userId,
    request.nudgeKind,
    request.leadChallengeId ?? '',
    request.userChallengeId ?? '',
  ].join(':');
}

function uniqueByUser<T extends { userId: string }>(items: readonly T[]): T[] {
  const byUser = new Map<string, T>();
  for (const item of items) {
    if (!byUser.has(item.userId)) {
      byUser.set(item.userId, item);
    }
  }
  return [...byUser.values()];
}

function groupBy<T>(items: readonly T[], keyOf: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return map;
}

function measuredCountFromDraft(draft: unknown): number | null {
  if (!draft || typeof draft !== 'object') {
    return null;
  }

  const record = draft as { kind?: string; fields?: Record<string, unknown> };
  if (
    record.kind === 'water' &&
    typeof record.fields?.amount === 'number' &&
    record.fields.unit === 'glasses'
  ) {
    return record.fields.amount;
  }

  if (typeof record.fields?.count === 'number') {
    return record.fields.count;
  }

  return null;
}

function maxDeviceCountForDay(input: {
  logs: Array<{
    userId: string;
    metric: string;
    count: number | null;
    endedAt: Date | null;
    createdAt: Date;
  }>;
  userId: string;
  metric: string;
  timeZone: string;
  dayKey: string;
}): number | null {
  let best: number | null = null;

  for (const log of input.logs) {
    if (log.userId !== input.userId || log.metric !== input.metric) {
      continue;
    }

    if (dayKeyFor(input.timeZone, log.endedAt ?? log.createdAt) !== input.dayKey) {
      continue;
    }

    if (log.count == null) {
      continue;
    }

    best = best == null ? log.count : Math.max(best, log.count);
  }

  return best;
}
