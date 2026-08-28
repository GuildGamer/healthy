import { Inject, Injectable } from '@nestjs/common';
import { ORPCError } from '@orpc/server';
import type {
  HealthCategory,
  PrismaClient,
  UserChallengeStatus,
} from '@product/db';
import type { AuthenticatedUser } from '../me/me.service.js';
import { PRISMA } from '../prisma/prisma.tokens.js';

export type TodayChallengeDto = {
  id: string;
  challengeId: string;
  title: string;
  description: string;
  category: HealthCategory;
  rewardPoints: number;
  status: UserChallengeStatus;
  dayKey: string;
};

export type ListTodayChallengesDto = {
  dayKey: string;
  challenges: TodayChallengeDto[];
  completedCount: number;
  totalCount: number;
};

export type StartChallengeDto = {
  challenge: TodayChallengeDto;
};

export type CompleteChallengeDto = {
  challenge: TodayChallengeDto;
  pointsBalance: number;
  currentStreakDays: number;
  pointsAwarded: number;
};

export type ActivityItemDto = {
  id: string;
  delta: number;
  reason: string;
  createdAt: string;
};

function utcDayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function previousUtcDayKey(dayKey: string): string {
  const date = new Date(`${dayKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class ChallengesService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async listToday(
    currentUser: AuthenticatedUser | null | undefined,
  ): Promise<ListTodayChallengesDto> {
    const user = this.requireUser(currentUser);

    const dayKey = utcDayKey();
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId: user.id },
      select: { healthCategories: true },
    });

    const userCategories = profile?.healthCategories ?? [];
    const categoryFilter: HealthCategory[] =
      userCategories.length > 0
        ? [...new Set<HealthCategory>([...userCategories, 'general'])]
        : ['hypertension', 'diabetes', 'asthma', 'general'];

    const catalog = await this.prisma.challenge.findMany({
      where: {
        isActive: true,
        category: { in: categoryFilter },
      },
      orderBy: { title: 'asc' },
    });

    for (const challenge of catalog) {
      await this.prisma.userChallenge.upsert({
        where: {
          userId_challengeId_dayKey: {
            userId: user.id,
            challengeId: challenge.id,
            dayKey,
          },
        },
        create: {
          userId: user.id,
          challengeId: challenge.id,
          dayKey,
        },
        update: {},
      });
    }

    const assignments = await this.prisma.userChallenge.findMany({
      where: {
        userId: user.id,
        dayKey,
        challengeId: { in: catalog.map((item) => item.id) },
      },
      include: { challenge: true },
      orderBy: { challenge: { title: 'asc' } },
    });

    const challenges = assignments.map((assignment) =>
      this.toTodayChallenge(assignment),
    );

    return {
      dayKey,
      challenges,
      completedCount: challenges.filter((item) => item.status === 'completed')
        .length,
      totalCount: challenges.length,
    };
  }

  /**
   * Moves a pending assignment to `in_progress`. Points are only awarded on
   * completion, so this is purely a state transition and is safe to retry.
   */
  async start(
    currentUser: AuthenticatedUser | null | undefined,
    userChallengeId: string,
  ): Promise<StartChallengeDto> {
    const user = this.requireUser(currentUser);
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
  ): Promise<CompleteChallengeDto> {
    const user = this.requireUser(currentUser);
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

    const idempotencyKey = `challenge_complete:${assignment.id}`;
    const rewardPoints = assignment.challenge.rewardPoints;
    const dayKey = assignment.dayKey;
    const yesterdayKey = previousUtcDayKey(dayKey);

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

      const completedBeforeToday = await tx.userChallenge.count({
        where: {
          userId: user.id,
          dayKey,
          status: 'completed',
        },
      });
      const isFirstCompletionToday = completedBeforeToday === 0;

      const completed = await tx.userChallenge.update({
        where: { id: assignment.id },
        data: {
          status: 'completed',
          startedAt: assignment.startedAt ?? new Date(),
          completedAt: new Date(),
        },
        include: { challenge: true },
      });

      await tx.pointLedgerEntry.create({
        data: {
          userId: user.id,
          delta: rewardPoints,
          reason: `Completed: ${assignment.challenge.title}`,
          idempotencyKey,
          userChallengeId: assignment.id,
        },
      });

      const profileBefore = await tx.userProfile.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          pointsBalance: 0,
          currentStreakDays: 0,
        },
        update: {},
      });

      let nextStreak = profileBefore.currentStreakDays;
      if (isFirstCompletionToday) {
        const hadYesterday = await tx.userChallenge.findFirst({
          where: {
            userId: user.id,
            dayKey: yesterdayKey,
            status: 'completed',
          },
          select: { id: true },
        });
        nextStreak = hadYesterday ? profileBefore.currentStreakDays + 1 : 1;
      }

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
  ): Promise<{ items: ActivityItemDto[] }> {
    const user = this.requireUser(currentUser);

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

  private requireUser(
    currentUser: AuthenticatedUser | null | undefined,
  ): AuthenticatedUser {
    if (currentUser) {
      return currentUser;
    }

    throw new ORPCError('UNAUTHORIZED', {
      message: 'Authentication required',
    });
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
    dayKey: string;
    status: UserChallengeStatus;
    challenge: {
      title: string;
      description: string;
      category: HealthCategory;
      rewardPoints: number;
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
      dayKey: assignment.dayKey,
    };
  }
}
