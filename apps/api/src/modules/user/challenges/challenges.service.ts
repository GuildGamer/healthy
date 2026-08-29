import { Inject, Injectable } from '@nestjs/common';
import { ORPCError } from '@orpc/server';
import type {
  ChallengeCompletionKind,
  ChallengeFrequency,
  HealthCategory,
  PrismaClient,
  UserChallengeStatus,
} from '@product/db';
import {
  type AuthenticatedUser,
  requireUser,
} from '../../../shared/types/authenticated-user.js';
import {
  DEFAULT_TIME_ZONE,
  dayKeyFor,
  previousDayKey,
} from '../../../shared/utils/day-key.js';
import { periodKeyFor } from '../../../shared/utils/period-key.js';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import type {
  CompleteChallengeDto,
  ListActivityDto,
  ListTodayChallengesDto,
  StartChallengeDto,
  TodayChallengeDto,
} from './dto/index.js';
import { requireVitalsFor, type ChallengeVitalsInput } from './vitals.js';

/** The period key currently open for each cadence, in the user's own zone. */
type DueWindow = Record<ChallengeFrequency, string>;


@Injectable()
export class ChallengesService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  /**
   * Everything due right now: today's daily challenges plus any weekly or
   * monthly ones whose period is still open. Occurrences are materialised on
   * read, so a user who does not open the app simply has none created.
   */
  async listToday(
    currentUser: AuthenticatedUser | null | undefined,
  ): Promise<ListTodayChallengesDto> {
    const user = requireUser(currentUser);
    const timeZone = await this.timeZoneFor(user.id);
    const window = this.dueWindow(timeZone);

    await this.materialiseDueOccurrences(user.id, window);

    const assignments = await this.prisma.userChallenge.findMany({
      where: this.dueFilter(user.id, window),
      include: { challenge: true },
      orderBy: [{ frequency: 'asc' }, { challenge: { title: 'asc' } }],
    });

    const challenges = assignments.map((assignment) =>
      this.toTodayChallenge(assignment),
    );

    return {
      dayKey: window.daily,
      challenges,
      completedCount: challenges.filter((item) => item.status === 'completed')
        .length,
      totalCount: challenges.length,
    };
  }

  /**
   * Moves a pending occurrence to `in_progress`. Points are only awarded on
   * completion, so this is purely a state transition and is safe to retry.
   */
  async start(
    currentUser: AuthenticatedUser | null | undefined,
    userChallengeId: string,
  ): Promise<StartChallengeDto> {
    const user = requireUser(currentUser);
    const assignment = await this.findOwnedAssignment(user.id, userChallengeId);

    // Scoping the update to `pending` stops a concurrent completion from being
    // rolled back to `in_progress`.
    await this.prisma.userChallenge.updateMany({
      where: { id: assignment.id, status: 'pending' },
      data: { status: 'in_progress', startedAt: new Date() },
    });

    const started = await this.prisma.userChallenge.findUniqueOrThrow({
      where: { id: assignment.id },
      include: { challenge: true },
    });

    return { challenge: this.toTodayChallenge(started) };
  }

  async complete(
    currentUser: AuthenticatedUser | null | undefined,
    userChallengeId: string,
    vitals?: ChallengeVitalsInput,
  ): Promise<CompleteChallengeDto> {
    const user = requireUser(currentUser);
    const assignment = await this.findOwnedAssignment(user.id, userChallengeId);

    if (assignment.status === 'completed') {
      const profile = await this.ensureProfile(user.id);
      return {
        challenge: this.toTodayChallenge(assignment),
        pointsBalance: profile.pointsBalance,
        currentStreakDays: profile.currentStreakDays,
        pointsAwarded: 0,
      };
    }

    const reading = requireVitalsFor(assignment.challenge.completionKind, vitals);

    const timeZone = await this.timeZoneFor(user.id);
    const todayKey = dayKeyFor(timeZone);
    const idempotencyKey = `challenge_complete:${assignment.id}`;
    const rewardPoints = assignment.challenge.rewardPoints;

    return this.prisma.$transaction(async (tx) => {
      const existingLedger = await tx.pointLedgerEntry.findUnique({
        where: { idempotencyKey },
      });

      if (existingLedger) {
        const profile = await tx.userProfile.findUniqueOrThrow({
          where: { userId: user.id },
        });
        const refreshed = await tx.userChallenge.findUniqueOrThrow({
          where: { id: assignment.id },
          include: { challenge: true },
        });
        return {
          challenge: this.toTodayChallenge(refreshed),
          pointsBalance: profile.pointsBalance,
          currentStreakDays: profile.currentStreakDays,
          pointsAwarded: 0,
        };
      }

      // Read before the write, so "was anything already done today" is not
      // confused by the row this call is about to complete.
      const dailyDoneBefore = await tx.userChallenge.count({
        where: {
          userId: user.id,
          frequency: 'daily',
          periodKey: todayKey,
          status: 'completed',
        },
      });

      const completed = await tx.userChallenge.update({
        where: { id: assignment.id },
        data: {
          status: 'completed',
          startedAt: assignment.startedAt ?? new Date(),
          completedAt: new Date(),
        },
        include: { challenge: true },
      });

      if (reading) {
        await tx.vitalReading.upsert({
          where: { userChallengeId: assignment.id },
          create: {
            userChallengeId: assignment.id,
            systolic: reading.systolic,
            diastolic: reading.diastolic,
            pulse: reading.pulse,
            notes: reading.notes,
          },
          update: {
            systolic: reading.systolic,
            diastolic: reading.diastolic,
            pulse: reading.pulse,
            notes: reading.notes,
            recordedAt: new Date(),
          },
        });
      }

      await tx.pointLedgerEntry.create({
        data: {
          userId: user.id,
          delta: rewardPoints,
          reason: `Completed: ${assignment.challenge.title}`,
          idempotencyKey,
          userChallengeId: assignment.id,
        },
      });

      await tx.notification.upsert({
        where: { idempotencyKey },
        create: {
          userId: user.id,
          kind: 'success',
          title: 'Challenge completed',
          body: `You earned ${rewardPoints} points for ${assignment.challenge.title}.`,
          idempotencyKey,
        },
        update: {},
      });

      const profileBefore = await tx.userProfile.upsert({
        where: { userId: user.id },
        create: { userId: user.id },
        update: {},
      });

      const nextStreak = await this.nextStreakDays(tx, {
        userId: user.id,
        storedStreakDays: profileBefore.currentStreakDays,
        completedFrequency: assignment.frequency,
        isFirstDailyToday: dailyDoneBefore === 0,
        todayKey,
      });

      const profile = await tx.userProfile.update({
        where: { userId: user.id },
        data: {
          pointsBalance: { increment: rewardPoints },
          currentStreakDays: nextStreak,
        },
      });

      return {
        challenge: this.toTodayChallenge(completed),
        pointsBalance: profile.pointsBalance,
        currentStreakDays: profile.currentStreakDays,
        pointsAwarded: rewardPoints,
      };
    });
  }

  async listActivity(
    currentUser: AuthenticatedUser | null | undefined,
  ): Promise<ListActivityDto> {
    const user = requireUser(currentUser);

    const entries = await this.prisma.pointLedgerEntry.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      items: entries.map((entry) => ({
        id: entry.id,
        delta: entry.delta,
        reason: entry.reason,
        createdAt: entry.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Only daily challenges carry the streak. A monthly check-up completed once
   * should not imply a month of consecutive daily effort.
   */
  private async nextStreakDays(
    tx: Pick<PrismaClient, 'userChallenge'>,
    input: {
      userId: string;
      storedStreakDays: number;
      completedFrequency: ChallengeFrequency;
      isFirstDailyToday: boolean;
      todayKey: string;
    },
  ): Promise<number> {
    if (input.completedFrequency !== 'daily' || !input.isFirstDailyToday) {
      return input.storedStreakDays;
    }

    const continuedYesterday = await tx.userChallenge.findFirst({
      where: {
        userId: input.userId,
        frequency: 'daily',
        periodKey: previousDayKey(input.todayKey),
        status: 'completed',
      },
      select: { id: true },
    });

    return continuedYesterday ? input.storedStreakDays + 1 : 1;
  }


  /** Creates the occurrence rows for any enrolment whose period has opened. */
  private async materialiseDueOccurrences(
    userId: string,
    window: DueWindow,
  ): Promise<void> {
    const enrollments = await this.prisma.challengeEnrollment.findMany({
      where: { userId, isActive: true, challenge: { isActive: true } },
      select: { id: true, challengeId: true, frequency: true },
    });

    if (enrollments.length === 0) {
      return;
    }

    await this.prisma.userChallenge.createMany({
      data: enrollments.map((enrollment) => ({
        userId,
        challengeId: enrollment.challengeId,
        enrollmentId: enrollment.id,
        frequency: enrollment.frequency,
        periodKey: window[enrollment.frequency],
      })),
      // The unique key on (user, challenge, period) makes this the whole
      // idempotency story — re-reading the list never duplicates or resets.
      skipDuplicates: true,
    });
  }

  private dueWindow(timeZone: string): DueWindow {
    return {
      daily: periodKeyFor('daily', timeZone),
      weekly: periodKeyFor('weekly', timeZone),
      monthly: periodKeyFor('monthly', timeZone),
    };
  }

  private dueFilter(userId: string, window: DueWindow) {
    return {
      userId,
      OR: [
        { frequency: 'daily' as const, periodKey: window.daily },
        { frequency: 'weekly' as const, periodKey: window.weekly },
        { frequency: 'monthly' as const, periodKey: window.monthly },
      ],
    };
  }

  private async timeZoneFor(userId: string): Promise<string> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { timeZone: true },
    });

    return profile?.timeZone ?? DEFAULT_TIME_ZONE;
  }

  private async findOwnedAssignment(userId: string, userChallengeId: string) {
    const assignment = await this.prisma.userChallenge.findUnique({
      where: { id: userChallengeId },
      include: { challenge: true },
    });

    if (!assignment || assignment.userId !== userId) {
      throw new ORPCError('NOT_FOUND', {
        message: 'Challenge assignment not found',
      });
    }

    return assignment;
  }

  private async ensureProfile(userId: string) {
    return this.prisma.userProfile.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  private toTodayChallenge(assignment: {
    id: string;
    challengeId: string;
    periodKey: string;
    frequency: ChallengeFrequency;
    status: UserChallengeStatus;
    challenge: {
      title: string;
      description: string;
      category: HealthCategory;
      rewardPoints: number;
      completionKind: ChallengeCompletionKind;
      instruction: string;
    };
  }): TodayChallengeDto {
    return {
      id: assignment.id,
      challengeId: assignment.challengeId,
      title: assignment.challenge.title,
      description: assignment.challenge.description,
      category: assignment.challenge.category,
      rewardPoints: assignment.challenge.rewardPoints,
      status: assignment.status,
      frequency: assignment.frequency,
      completionKind: assignment.challenge.completionKind,
      instruction: assignment.challenge.instruction || assignment.challenge.description,
      periodKey: assignment.periodKey,
    };
  }
}
