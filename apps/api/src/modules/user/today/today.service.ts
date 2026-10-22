import { Inject, Injectable } from '@nestjs/common';
import {
  resolveEnrollmentTargetCount,
  resolveEnrollmentTargetDuration,
  toChallengeCapture,
} from '@product/contract';
import type { DeviceMetric, PrismaClient } from '@product/db';
import { type AuthenticatedUser, requireUser } from '../../../shared/types/authenticated-user.js';
import { DEFAULT_TIME_ZONE, dayKeyFor } from '../../../shared/utils/day-key.js';
import { periodKeyFor } from '../../../shared/utils/period-key.js';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import { LOCAL_DAY_LEAD_MS } from '../../../shared/constants/local-day.js';
import type { TodayDetailsDto } from './dto/index.js';
import { buildOccurrenceDetails } from './today-details.js';
import type { DueOccurrence, MeasuredSession } from './types/today-details.js';

type LocalClock = {
  timeZone: string;
  dayKey: string;
  weekStartKey: string;
  monthStartKey: string;
};

/**
 * Facts the Today cards show beyond the occurrence itself. A fixed handful of
 * reads covers every card, however many there are.
 */
@Injectable()
export class TodayService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async details(
    currentUser: AuthenticatedUser | null | undefined,
    now: Date = new Date(),
  ): Promise<TodayDetailsDto> {
    const user = requireUser(currentUser);
    const clock = this.localClock(await this.timeZoneFor(user.id), now);
    const occurrences = await this.dueOccurrences(user.id, clock);
    const empty = { dayKey: clock.dayKey, weekStartKey: clock.weekStartKey, occurrences: [] };
    if (occurrences.length === 0) {
      return empty;
    }

    const since = this.readFrom(occurrences, clock);
    const [lastCompletedDayKeyByChallenge, completedDayKeysByChallenge, sessions] =
      await Promise.all([
        this.lastCompletedDayKeys(user.id, occurrences, clock.timeZone),
        this.completedDayKeys(user.id, occurrences, clock.timeZone, since),
        this.measuredSessions(user.id, occurrences, clock.timeZone, since),
      ]);

    return {
      ...empty,
      occurrences: buildOccurrenceDetails({
        occurrences,
        lastCompletedDayKeyByChallenge,
        completedDayKeysByChallenge,
        sessions,
        dayKey: clock.dayKey,
        weekStartKey: clock.weekStartKey,
      }),
    };
  }

  private localClock(timeZone: string, now: Date): LocalClock {
    return {
      timeZone,
      dayKey: periodKeyFor('daily', timeZone, now),
      weekStartKey: periodKeyFor('weekly', timeZone, now),
      monthStartKey: periodKeyFor('monthly', timeZone, now),
    };
  }

  /** The earliest instant any card's period or the week strip can reach back to. */
  private readFrom(occurrences: readonly DueOccurrence[], clock: LocalClock): Date {
    const earliestKey = [
      clock.weekStartKey,
      ...occurrences.map((item) => item.periodKey),
    ].sort()[0];
    return new Date(Date.parse(`${earliestKey ?? clock.dayKey}T00:00:00.000Z`) - LOCAL_DAY_LEAD_MS);
  }

  private async dueOccurrences(userId: string, clock: LocalClock): Promise<DueOccurrence[]> {
    const rows = await this.prisma.userChallenge.findMany({
      where: {
        userId,
        OR: [
          { frequency: 'daily', periodKey: clock.dayKey },
          { frequency: 'weekly', periodKey: clock.weekStartKey },
          { frequency: 'monthly', periodKey: clock.monthStartKey },
        ],
      },
      select: {
        id: true,
        challengeId: true,
        periodKey: true,
        completedAt: true,
        enrollment: { select: { targetCount: true, targetDurationMinutes: true } },
        challenge: {
          select: {
            completionKind: true,
            captureKind: true,
            deviceMetric: true,
            targetDurationMinutes: true,
            targetDistanceMeters: true,
            targetCount: true,
          },
        },
      },
    });

    return rows.map((row) => ({
      id: row.id,
      challengeId: row.challengeId,
      periodKey: row.periodKey,
      completedAt: row.completedAt,
      capture: toChallengeCapture({
        ...row.challenge,
        targetCount: resolveEnrollmentTargetCount(
          row.challenge.targetCount,
          row.enrollment?.targetCount,
        ),
        targetDurationMinutes: resolveEnrollmentTargetDuration(
          row.challenge.targetDurationMinutes,
          row.enrollment?.targetDurationMinutes,
        ),
      }),
    }));
  }

  private async lastCompletedDayKeys(
    userId: string,
    occurrences: readonly DueOccurrence[],
    timeZone: string,
  ): Promise<Map<string, string>> {
    const latest = await this.prisma.userChallenge.groupBy({
      by: ['challengeId'],
      where: {
        userId,
        status: 'completed',
        challengeId: { in: occurrences.map((item) => item.challengeId) },
        id: { notIn: occurrences.map((item) => item.id) },
      },
      _max: { completedAt: true },
    });

    return new Map(
      latest.flatMap((row) =>
        row._max.completedAt ? [[row.challengeId, dayKeyFor(timeZone, row._max.completedAt)]] : [],
      ),
    );
  }

  private async completedDayKeys(
    userId: string,
    occurrences: readonly DueOccurrence[],
    timeZone: string,
    since: Date,
  ): Promise<Map<string, Set<string>>> {
    const completions = await this.prisma.userChallenge.findMany({
      where: {
        userId,
        status: 'completed',
        challengeId: { in: occurrences.map((item) => item.challengeId) },
        completedAt: { gte: since },
      },
      select: { challengeId: true, completedAt: true },
    });

    const daysByChallenge = new Map<string, Set<string>>();
    for (const completion of completions) {
      if (!completion.completedAt) {
        continue;
      }

      const days = daysByChallenge.get(completion.challengeId) ?? new Set<string>();
      days.add(dayKeyFor(timeZone, completion.completedAt));
      daysByChallenge.set(completion.challengeId, days);
    }

    return daysByChallenge;
  }

  /** Hand-confirmed activity is not measured, so it never counts as progress. */
  private async measuredSessions(
    userId: string,
    occurrences: readonly DueOccurrence[],
    timeZone: string,
    since: Date,
  ): Promise<MeasuredSession[]> {
    const metrics = [
      ...new Set(
        occurrences.flatMap((item): DeviceMetric[] =>
          item.capture.metric ? [item.capture.metric] : [],
        ),
      ),
    ];
    if (metrics.length === 0) {
      return [];
    }

    const logs = await this.prisma.deviceActivityLog.findMany({
      where: {
        userId,
        metric: { in: metrics },
        source: { not: 'manual' },
        createdAt: { gte: since },
      },
      select: {
        metric: true,
        durationSeconds: true,
        distanceMeters: true,
        count: true,
        endedAt: true,
        createdAt: true,
      },
    });

    return logs.map((log) => ({
      metric: log.metric,
      dayKey: dayKeyFor(timeZone, log.endedAt ?? log.createdAt),
      durationSeconds: log.durationSeconds,
      distanceMeters: log.distanceMeters,
      count: log.count,
    }));
  }

  private async timeZoneFor(userId: string): Promise<string> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { timeZone: true },
    });

    return profile?.timeZone ?? DEFAULT_TIME_ZONE;
  }
}
