import { Inject, Injectable } from '@nestjs/common';
import { ORPCError } from '@orpc/server';
import type {
  ChallengeFrequency,
  HealthCategory,
  PrismaClient,
} from '@product/db';
import {
  type AuthenticatedUser,
  requireUser,
} from '../../../shared/types/authenticated-user.js';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import { RemindersService } from '../reminders/reminders.service.js';
import type {
  CatalogChallengeDto,
  ChallengeCatalogDto,
} from './dto/challenge-catalog.dto.js';

/** Everyone sees general-health challenges alongside their own conditions. */
const UNIVERSAL_CATEGORY: HealthCategory = 'general';

const ALL_CATEGORIES: HealthCategory[] = [
  'hypertension',
  'diabetes',
  'asthma',
  'general',
];

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
    const categories = await this.categoriesFor(user.id);

    const [catalog, enrollments] = await Promise.all([
      this.prisma.challenge.findMany({
        where: { isActive: true, category: { in: categories } },
        orderBy: [{ category: 'asc' }, { title: 'asc' }],
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

      return {
        challengeId: challenge.id,
        slug: challenge.slug,
        title: challenge.title,
        description: challenge.description,
        category: challenge.category,
        rewardPoints: challenge.rewardPoints,
        frequency: enrollment?.frequency ?? challenge.defaultFrequency,
        completionKind: challenge.completionKind,
        instruction: challenge.instruction || challenge.description,
        isEnrolled: enrollment?.isActive ?? false,
        // A deactivated enrolment keeps its reminders in the database, but
        // showing them would imply nudges that will never fire.
        reminders: enrollment?.isActive ? enrollment.reminders : [],
      };
    });


    return {
      challenges,
      enrolledCount: challenges.filter((challenge) => challenge.isEnrolled)
        .length,
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
  ): Promise<ChallengeCatalogDto> {
    const user = requireUser(currentUser);

    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
      select: { id: true, isActive: true, defaultFrequency: true },
    });

    if (!challenge || !challenge.isActive) {
      throw new ORPCError('NOT_FOUND', { message: 'Challenge not found' });
    }

    const chosenFrequency = frequency ?? challenge.defaultFrequency;

    const existing = await this.prisma.challengeEnrollment.findUnique({
      where: {
        userId_challengeId: { userId: user.id, challengeId: challenge.id },
      },
      select: { id: true },
    });

    const enrollment = await this.prisma.challengeEnrollment.upsert({
      where: {
        userId_challengeId: { userId: user.id, challengeId: challenge.id },
      },
      create: {
        userId: user.id,
        challengeId: challenge.id,
        frequency: chosenFrequency,
        isActive: isEnrolled,
      },
      update: {
        frequency: chosenFrequency,
        isActive: isEnrolled,
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
   * Enrols a user in the starter set for the categories they just chose.
   * Idempotent, and deliberately does not revive an enrolment the user turned
   * off — only genuinely new rows are created.
   */
  async enrollDefaultsFor(
    userId: string,
    categories: readonly HealthCategory[],
  ): Promise<void> {
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

    const enrolledIds = new Set(
      alreadyEnrolled.map((enrollment) => enrollment.challengeId),
    );
    const newChallenges = defaults.filter(
      (challenge) => !enrolledIds.has(challenge.id),
    );

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

  private withUniversalCategory(
    categories: readonly HealthCategory[],
  ): HealthCategory[] {
    return [...new Set<HealthCategory>([...categories, UNIVERSAL_CATEGORY])];
  }
}
