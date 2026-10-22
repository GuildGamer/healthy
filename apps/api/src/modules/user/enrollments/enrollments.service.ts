import { Inject, Injectable } from '@nestjs/common';
import { ORPCError } from '@orpc/server';
import {
  displayChallengeTitle,
  durationGoalBounds,
  resolveEnrollmentTargetCount,
  resolveEnrollmentTargetDuration,
  toChallengeCapture,
  toChallengeIcon,
} from '@product/contract';
import type { ChallengeFrequency, HealthCategory, PrismaClient } from '@product/db';
import { type AuthenticatedUser, requireUser } from '../../../shared/types/authenticated-user.js';
import {
  canEnrollInChallenge,
  isCatalogChallengeLocked,
  maxRemindersForMembership,
} from '../../../shared/membership/entitlements.js';
import { effectiveMembershipActive } from '../../../shared/membership/testing-membership.js';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import { RemindersService } from '../reminders/reminders.service.js';
import type { CatalogChallengeDto, ChallengeCatalogDto } from './dto/challenge-catalog.dto.js';
import type { EnrollmentGoalDto } from './dto/enrollment-goal.dto.js';
import type { StarterChallengeDto, StarterChallengesDto } from './dto/starter-challenge.dto.js';

/** Everyone sees general-health challenges alongside their own conditions. */
const UNIVERSAL_CATEGORY: HealthCategory = 'general';

const ALL_CATEGORIES: HealthCategory[] = ['hypertension', 'diabetes', 'asthma', 'general'];

@Injectable()
export class EnrollmentsService {
  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly reminders: RemindersService,
  ) {}

  /**
   * The catalog a user may choose from: every active challenge matching their
   * conditions, annotated with whether they are currently enrolled.
   */
  async listCatalog(
    currentUser: AuthenticatedUser | null | undefined,
  ): Promise<ChallengeCatalogDto> {
    const user = requireUser(currentUser);
    const [categories, membershipActive] = await Promise.all([
      this.categoriesFor(user.id),
      this.membershipActiveFor(user.id),
    ]);

    const [catalog, enrollments] = await Promise.all([
      this.prisma.challenge.findMany({
        where: { isActive: true, category: { in: categories } },
        orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { title: 'asc' }],
      }),
      this.prisma.challengeEnrollment.findMany({
        where: { userId: user.id },
        include: {
          reminders: {
            orderBy: { minuteOfDay: 'asc' },
            select: { id: true, minuteOfDay: true },
          },
        },
      }),
    ]);

    const byChallengeId = new Map(
      enrollments.map((enrollment) => [enrollment.challengeId, enrollment]),
    );

    const challenges: CatalogChallengeDto[] = catalog.map((challenge) => {
      const enrollment = byChallengeId.get(challenge.id);
      const isEnrolled = enrollment?.isActive ?? false;
      const requiresMembership = challenge.requiresMembership;
      const targetCount = resolveEnrollmentTargetCount(
        challenge.targetCount,
        enrollment?.targetCount,
      );

      return {
        challengeId: challenge.id,
        slug: challenge.slug,
        title: displayChallengeTitle({
          title: challenge.title,
          metric: challenge.deviceMetric,
          count: targetCount,
        }),
        description: challenge.description,
        category: challenge.category,
        rewardPoints: challenge.rewardPoints,
        sortOrder: challenge.sortOrder,
        frequency: enrollment?.frequency ?? challenge.defaultFrequency,
        completionKind: challenge.completionKind,
        instruction: challenge.instruction || challenge.description,
        icon: toChallengeIcon(challenge.icon),
        isEnrolled,
        requiresMembership,
        isLocked: isCatalogChallengeLocked({
          requiresMembership,
          membershipActive,
        }),
        // A deactivated enrolment keeps its reminders in the database, but
        // showing them would imply nudges that will never fire.
        reminders: isEnrolled ? enrollment!.reminders : [],
        capture: toChallengeCapture({
          ...challenge,
          targetCount,
          targetDurationMinutes: resolveEnrollmentTargetDuration(
            challenge.targetDurationMinutes,
            enrollment?.targetDurationMinutes,
          ),
        }),
      };
    });

    return {
      challenges,
      enrolledCount: challenges.filter((challenge) => challenge.isEnrolled).length,
      hasMembership: membershipActive,
      maxRemindersPerChallenge: maxRemindersForMembership(membershipActive),
    };
  }

  /**
   * Opts a user in or out, and sets the cadence they want. Enrolments are
   * deactivated rather than deleted so past occurrences keep their context.
   */
  async setEnrollment(
    currentUser: AuthenticatedUser | null | undefined,
    challengeId: string,
    isEnrolled: boolean,
    frequency?: ChallengeFrequency,
    goal: EnrollmentGoalDto = {},
  ): Promise<ChallengeCatalogDto> {
    const user = requireUser(currentUser);

    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
      select: {
        id: true,
        isActive: true,
        defaultFrequency: true,
        requiresMembership: true,
        targetCount: true,
        targetDurationMinutes: true,
      },
    });

    if (!challenge || !challenge.isActive) {
      throw new ORPCError('NOT_FOUND', { message: 'Challenge not found' });
    }

    const [membershipActive, existing] = await Promise.all([
      this.membershipActiveFor(user.id),
      this.prisma.challengeEnrollment.findUnique({
        where: {
          userId_challengeId: { userId: user.id, challengeId: challenge.id },
        },
        select: { id: true, isActive: true },
      }),
    ]);

    if (
      !canEnrollInChallenge({
        requiresMembership: challenge.requiresMembership,
        membershipActive,
        enrolling: isEnrolled,
      })
    ) {
      throw new ORPCError('FORBIDDEN', {
        message: 'Membership is required to add this challenge',
        data: { reason: 'membership_required' },
      });
    }

    this.assertGoalFits(challenge, goal);

    const chosenFrequency = frequency ?? challenge.defaultFrequency;

    const enrollment = await this.prisma.challengeEnrollment.upsert({
      where: {
        userId_challengeId: { userId: user.id, challengeId: challenge.id },
      },
      create: {
        userId: user.id,
        challengeId: challenge.id,
        frequency: chosenFrequency,
        isActive: isEnrolled,
        targetCount: goal.targetCount ?? null,
        targetDurationMinutes: goal.targetDurationMinutes ?? null,
      },
      update: {
        frequency: chosenFrequency,
        isActive: isEnrolled,
        ...goal,
      },
      select: { id: true },
    });

    // Only a first-time opt-in gets a reminder. Re-enabling something the user
    // had switched off restores their own times, not a fresh default.
    if (!existing && isEnrolled) {
      await this.reminders.seedDefaultReminders(user.id, [enrollment.id]);
    }

    return this.listCatalog(user);
  }

  /**
   * A goal only changes what the challenge already measures, and a minutes
   * goal stays within `durationGoalBounds`. Points are the catalogue's either way.
   */
  private assertGoalFits(
    challenge: { targetCount: number | null; targetDurationMinutes: number | null },
    goal: EnrollmentGoalDto,
  ): void {
    if (goal.targetCount !== undefined && challenge.targetCount == null) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'This challenge does not have a count you can change',
      });
    }

    if (goal.targetDurationMinutes === undefined) {
      return;
    }

    if (challenge.targetDurationMinutes == null) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'This challenge does not have minutes you can change',
      });
    }

    const bounds = durationGoalBounds(challenge.targetDurationMinutes);
    if (goal.targetDurationMinutes < bounds.min || goal.targetDurationMinutes > bounds.max) {
      throw new ORPCError('BAD_REQUEST', {
        message: `Choose between ${bounds.min} and ${bounds.max} minutes`,
      });
    }
  }

  /**
   * Every challenge `enrollDefaultsFor` could enrol, for previewing a first
   * day before sign-up. Catalog data only, the same for every caller.
   */
  async listStarterChallenges(): Promise<StarterChallengesDto> {
    const defaults = await this.prisma.challenge.findMany({
      where: { isActive: true, isDefault: true },
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    });

    const challenges: StarterChallengeDto[] = defaults.map((challenge) => ({
      challengeId: challenge.id,
      title: displayChallengeTitle({
        title: challenge.title,
        metric: challenge.deviceMetric,
        count: challenge.targetCount,
      }),
      description: challenge.description,
      category: challenge.category,
      isUniversal: challenge.category === UNIVERSAL_CATEGORY,
      completionKind: challenge.completionKind,
      capture: toChallengeCapture(challenge),
    }));

    return { challenges };
  }

  /**
   * Enrols a user in the starter set for the categories they just chose.
   * Idempotent, and deliberately does not revive an enrolment the user turned
   * off — only genuinely new rows are created.
   */
  async enrollDefaultsFor(userId: string, categories: readonly HealthCategory[]): Promise<void> {
    const scope = this.withUniversalCategory(categories);

    const defaults = await this.prisma.challenge.findMany({
      where: { isActive: true, isDefault: true, category: { in: scope } },
      select: { id: true, defaultFrequency: true },
    });

    if (defaults.length === 0) {
      return;
    }

    const alreadyEnrolled = await this.prisma.challengeEnrollment.findMany({
      where: { userId, challengeId: { in: defaults.map((item) => item.id) } },
      select: { challengeId: true },
    });

    const enrolledIds = new Set(alreadyEnrolled.map((enrollment) => enrollment.challengeId));
    const newChallenges = defaults.filter((challenge) => !enrolledIds.has(challenge.id));

    if (newChallenges.length === 0) {
      return;
    }

    await this.prisma.challengeEnrollment.createMany({
      data: newChallenges.map((challenge) => ({
        userId,
        challengeId: challenge.id,
        frequency: challenge.defaultFrequency,
      })),
      skipDuplicates: true,
    });

    // `createMany` does not return rows, and only the ones created just now
    // should get a starter reminder.
    const created = await this.prisma.challengeEnrollment.findMany({
      where: {
        userId,
        challengeId: { in: newChallenges.map((challenge) => challenge.id) },
      },
      select: { id: true },
    });

    await this.reminders.seedDefaultReminders(
      userId,
      created.map((enrollment) => enrollment.id),
    );
  }

  private async membershipActiveFor(userId: string): Promise<boolean> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { membershipActive: true },
    });

    return effectiveMembershipActive(profile?.membershipActive);
  }

  private async categoriesFor(userId: string): Promise<HealthCategory[]> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { healthCategories: true },
    });

    const chosen = profile?.healthCategories ?? [];

    // Before onboarding completes there is nothing to narrow by, so show
    // everything rather than an empty screen.
    if (chosen.length === 0) {
      return ALL_CATEGORIES;
    }

    return this.withUniversalCategory(chosen);
  }

  private withUniversalCategory(categories: readonly HealthCategory[]): HealthCategory[] {
    return [...new Set<HealthCategory>([...categories, UNIVERSAL_CATEGORY])];
  }
}
