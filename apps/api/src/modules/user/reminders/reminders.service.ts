import { Inject, Injectable } from '@nestjs/common';
import { ORPCError } from '@orpc/server';
import type { PrismaClient } from '@product/db';
import {
  type AuthenticatedUser,
  requireUser,
} from '../../../shared/types/authenticated-user.js';
import { PRISMA } from '../../shared-modules/database/prisma.tokens.js';
import {
  DEFAULT_REMINDER_MINUTE,
  MAX_REMINDERS_PER_CHALLENGE,
  MINUTES_PER_DAY,
} from '../../../shared/constants/reminder-defaults.js';
import { maxRemindersForMembership } from '../../../shared/membership/entitlements.js';
import type {
  ChallengeReminderDto,
  ChallengeRemindersDto,
} from './dto/challenge-reminder.dto.js';

@Injectable()
export class RemindersService {
  constructor(@Inject(PRISMA) private readonly prisma: PrismaClient) {}

  async listForChallenge(
    currentUser: AuthenticatedUser | null | undefined,
    challengeId: string,
  ): Promise<ChallengeRemindersDto> {
    const user = requireUser(currentUser);
    const enrollment = await this.findEnrollment(user.id, challengeId);

    return this.remindersFor(enrollment.id, challengeId);
  }

  async addReminder(
    currentUser: AuthenticatedUser | null | undefined,
    challengeId: string,
    minuteOfDay: number,
  ): Promise<ChallengeRemindersDto> {
    const user = requireUser(currentUser);
    this.assertMinuteOfDay(minuteOfDay);

    const enrollment = await this.findEnrollment(user.id, challengeId);
    const membershipActive = await this.membershipActiveFor(user.id);
    const maxReminders = maxRemindersForMembership(membershipActive);

    const existingCount = await this.prisma.challengeReminder.count({
      where: { enrollmentId: enrollment.id },
    });

    if (existingCount >= maxReminders) {
      if (!membershipActive && maxReminders < MAX_REMINDERS_PER_CHALLENGE) {
        throw new ORPCError('FORBIDDEN', {
          message: 'Membership is required for more reminder times',
          data: { reason: 'membership_required' },
        });
      }

      throw new ORPCError('BAD_REQUEST', {
        message: `A challenge can have at most ${maxReminders} reminders`,
      });
    }

    // Adding a time that already exists should be a no-op, not a duplicate
    // nudge, so the unique key carries the idempotency.
    await this.prisma.challengeReminder.createMany({
      data: [{ enrollmentId: enrollment.id, minuteOfDay }],
      skipDuplicates: true,
    });

    return this.remindersFor(enrollment.id, challengeId);
  }

  async removeReminder(
    currentUser: AuthenticatedUser | null | undefined,
    reminderId: string,
  ): Promise<ChallengeRemindersDto> {
    const user = requireUser(currentUser);

    const reminder = await this.prisma.challengeReminder.findUnique({
      where: { id: reminderId },
      select: {
        id: true,
        enrollmentId: true,
        enrollment: { select: { userId: true, challengeId: true } },
      },
    });

    if (!reminder || reminder.enrollment.userId !== user.id) {
      throw new ORPCError('NOT_FOUND', { message: 'Reminder not found' });
    }

    await this.prisma.challengeReminder.delete({ where: { id: reminder.id } });

    return this.remindersFor(
      reminder.enrollmentId,
      reminder.enrollment.challengeId,
    );
  }

  /**
   * Gives freshly created enrolments their first nudge, at whatever default the
   * user has chosen. Only ever called with enrolments that did not exist a
   * moment ago, so a reminder the user deleted is never resurrected.
   */
  async seedDefaultReminders(
    userId: string,
    enrollmentIds: readonly string[],
  ): Promise<void> {
    if (enrollmentIds.length === 0) {
      return;
    }

    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { reminderMinute: true },
    });

    const minuteOfDay = profile?.reminderMinute ?? DEFAULT_REMINDER_MINUTE;

    await this.prisma.challengeReminder.createMany({
      data: enrollmentIds.map((enrollmentId) => ({
        enrollmentId,
        minuteOfDay,
      })),
      skipDuplicates: true,
    });
  }

  private async membershipActiveFor(userId: string): Promise<boolean> {
    const profile = await this.prisma.userProfile.findUnique({
      where: { userId },
      select: { membershipActive: true },
    });

    return profile?.membershipActive ?? false;
  }

  private async findEnrollment(
    userId: string,
    challengeId: string,
  ): Promise<{ id: string }> {
    const enrollment = await this.prisma.challengeEnrollment.findUnique({
      where: { userId_challengeId: { userId, challengeId } },
      select: { id: true, isActive: true },
    });

    if (!enrollment || !enrollment.isActive) {
      throw new ORPCError('NOT_FOUND', {
        message: 'You are not enrolled in this challenge',
      });
    }

    return { id: enrollment.id };
  }

  private async remindersFor(
    enrollmentId: string,
    challengeId: string,
  ): Promise<ChallengeRemindersDto> {
    const reminders = await this.prisma.challengeReminder.findMany({
      where: { enrollmentId },
      orderBy: { minuteOfDay: 'asc' },
      select: { id: true, minuteOfDay: true },
    });

    return {
      challengeId,
      reminders: reminders satisfies ChallengeReminderDto[],
    };
  }

  private assertMinuteOfDay(minuteOfDay: number): void {
    const isWholeMinuteOfDay =
      Number.isInteger(minuteOfDay) &&
      minuteOfDay >= 0 &&
      minuteOfDay < MINUTES_PER_DAY;

    if (!isWholeMinuteOfDay) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'Reminder time must be a minute within the day',
      });
    }
  }
}
