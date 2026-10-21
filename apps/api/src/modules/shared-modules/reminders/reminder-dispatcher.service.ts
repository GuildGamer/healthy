import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ChallengeFrequency, PrismaClient } from '@product/db';
import { dayKeyFor, localMinuteOfDay } from '../../../shared/utils/day-key.js';
import { periodKeyFor } from '../../../shared/utils/period-key.js';
import { PRISMA } from '../database/prisma.tokens.js';
import type { PushMessage, PushSender } from '../push/push-sender.js';
import { PUSH_SENDER } from '../push/push-sender.js';
import { PushDevicesService } from '../push/push-devices.service.js';
import { DISPATCH_CATCH_UP_MINUTES } from '../../../shared/constants/reminder-defaults.js';
import { isTestingMembershipEnabled } from '../../../shared/membership/testing-membership.js';
import {
  CHALLENGE_REMINDER_PUSH_TITLE,
  HABIT_SLOT_MINUTES,
  habitSlotCopy,
  habitSlotIdempotencyKey,
  IN_PROGRESS_NUDGE_PUSH_BODY,
  IN_PROGRESS_NUDGE_PUSH_TITLE,
} from './constants/habit-slot-copy.js';
import type { DispatchSummaryDto } from './dto/dispatch-summary.dto.js';

/** A reminder whose minute has arrived, resolved against its period. */
type DueReminder = {
  reminderId: string;
  userId: string;
  challengeId: string;
  challengeTitle: string;
  frequency: ChallengeFrequency;
  periodKey: string;
};

type ReminderRow = {
  id: string;
  enrollment: {
    userId: string;
    challengeId: string;
    frequency: ChallengeFrequency;
    challenge: { title: string };
  };
};

type HabitSlotCandidate = {
  userId: string;
  timeZone: string;
  dayKey: string;
  minuteOfDay: number;
  openChallengeIds: string[];
};

export type HabitSlotDispatchSummary = DispatchSummaryDto & {
  /** Users who received a habit slot this run — skip their same-minute reminders. */
  sentUserIds: string[];
};

@Injectable()
export class ReminderDispatcherService {
  private readonly logger = new Logger(ReminderDispatcherService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    @Inject(PUSH_SENDER) private readonly pushSender: PushSender,
    private readonly pushDevices: PushDevicesService,
  ) {}

  /**
   * One CTA for the whole day at each waking slot, while a daily challenge is
   * still open. Safe to retry: the inbox idempotency key stops duplicates.
   */
  async dispatchHabitSlots(
    now: Date = new Date(),
  ): Promise<HabitSlotDispatchSummary> {
    const timeZones = await this.timeZonesWithRemindersEnabled();
    const candidatesByZone = await Promise.all(
      timeZones.map((timeZone) => this.findHabitSlotsInZone(timeZone, now)),
    );
    const candidates = candidatesByZone.flat();

    if (candidates.length === 0) {
      return { dueCount: 0, sentCount: 0, suppressedCount: 0, sentUserIds: [] };
    }

    const undelivered = await this.excludeAlreadySentHabitSlots(candidates);
    if (undelivered.length === 0) {
      return {
        dueCount: candidates.length,
        sentCount: 0,
        suppressedCount: 0,
        sentUserIds: [],
      };
    }

    const tokensByUserId = await this.activeTokensByUserId(
      undelivered.map((item) => item.userId),
    );
    const messages: PushMessage[] = [];
    const deliverable: HabitSlotCandidate[] = [];

    for (const item of undelivered) {
      const copy = habitSlotCopy(item.minuteOfDay);
      if (!copy) {
        continue;
      }

      const tokens = tokensByUserId.get(item.userId) ?? [];
      if (tokens.length === 0) {
        continue;
      }

      deliverable.push(item);
      const challengeId =
        item.openChallengeIds.length === 1
          ? item.openChallengeIds[0]
          : undefined;
      const data: Record<string, string> = { destination: 'today' };
      if (challengeId) {
        data.challengeId = challengeId;
      }

      for (const expoPushToken of tokens) {
        messages.push({
          expoPushToken,
          title: copy.title,
          body: copy.body,
          data,
        });
      }
    }

    if (messages.length === 0) {
      return {
        dueCount: candidates.length,
        sentCount: 0,
        suppressedCount: undelivered.length,
        sentUserIds: [],
      };
    }

    const result = await this.pushSender.send(messages);

    if (result.sentCount > 0) {
      await this.prisma.notification.createMany({
        data: deliverable.map((item) => {
          const copy = habitSlotCopy(item.minuteOfDay);
          return {
            userId: item.userId,
            kind: 'reminder' as const,
            title: copy?.title ?? 'Do one now',
            body: copy?.body ?? 'One challenge still open',
            idempotencyKey: habitSlotIdempotencyKey(
              item.userId,
              item.dayKey,
              item.minuteOfDay,
            ),
          };
        }),
        skipDuplicates: true,
      });
    }

    await this.pushDevices.deactivateTokens(result.rejectedTokens);

    this.logger.log(
      `Habit slot dispatch sent ${result.sentCount} of ${messages.length} messages`,
    );

    return {
      dueCount: candidates.length,
      sentCount: result.sentCount,
      suppressedCount: undelivered.length - deliverable.length,
      sentUserIds: deliverable.map((item) => item.userId),
    };
  }

  /**
   * Sends every reminder whose local minute has arrived and whose period is
   * still open. Safe to call repeatedly and on overlapping windows: a delivery
   * row is written per reminder and period, and only for messages the provider
   * accepted, so a failed send is retried on the next run.
   */
  async dispatchDue(
    now: Date = new Date(),
    skipUserIds: readonly string[] = [],
  ): Promise<DispatchSummaryDto> {
    const timeZones = await this.timeZonesWithRemindersEnabled();
    const skipped = new Set(skipUserIds);

    const dueByZone = await Promise.all(
      timeZones.map((timeZone) => this.findDueInZone(timeZone, now)),
    );

    const due = dueByZone.flat().filter((item) => !skipped.has(item.userId));

    if (due.length === 0) {
      return { dueCount: 0, sentCount: 0, suppressedCount: 0 };
    }

    const undelivered = await this.excludeAlreadyDelivered(due);
    const outstanding = await this.excludeCompleted(undelivered);
    const suppressedCount = undelivered.length - outstanding.length;

    if (outstanding.length === 0) {
      return { dueCount: due.length, sentCount: 0, suppressedCount };
    }

    const sentCount = await this.send(outstanding);

    return { dueCount: due.length, sentCount, suppressedCount };
  }

  /**
   * Reminder times are local, so the sweep is driven by the zones users are
   * actually in. There are few distinct zones, which keeps this far cheaper
   * than walking every reminder row each minute.
   */
  private async timeZonesWithRemindersEnabled(): Promise<string[]> {
    const zones = await this.prisma.userProfile.findMany({
      where: { reminderEnabled: true },
      select: { timeZone: true },
      distinct: ['timeZone'],
    });

    return zones.map((zone) => zone.timeZone);
  }

  private dueHabitMinutes(localMinute: number): number[] {
    const windowStart = localMinute - DISPATCH_CATCH_UP_MINUTES;

    return HABIT_SLOT_MINUTES.filter(
      (minute) => minute >= Math.max(windowStart, 0) && minute <= localMinute,
    );
  }

  private async findHabitSlotsInZone(
    timeZone: string,
    now: Date,
  ): Promise<HabitSlotCandidate[]> {
    const localMinute = localMinuteOfDay(timeZone, now);
    const dueMinutes = this.dueHabitMinutes(localMinute);
    if (dueMinutes.length === 0) {
      return [];
    }

    const dayKey = dayKeyFor(timeZone, now);
    const profiles = await this.prisma.userProfile.findMany({
      where: { timeZone, reminderEnabled: true },
      select: { userId: true },
    });

    if (profiles.length === 0) {
      return [];
    }

    const openByUser = await this.openDailyChallengeIdsByUser(
      profiles.map((profile) => profile.userId),
      dayKey,
    );

    const candidates: HabitSlotCandidate[] = [];

    for (const profile of profiles) {
      const openChallengeIds = openByUser.get(profile.userId) ?? [];
      if (openChallengeIds.length === 0) {
        continue;
      }

      for (const minuteOfDay of dueMinutes) {
        candidates.push({
          userId: profile.userId,
          timeZone,
          dayKey,
          minuteOfDay,
          openChallengeIds,
        });
      }
    }

    return candidates;
  }

  /**
   * Active daily enrolments that have no completed occurrence for today.
   * Occurrences are created on read, so absence of a row still means open.
   */
  private async openDailyChallengeIdsByUser(
    userIds: readonly string[],
    dayKey: string,
  ): Promise<Map<string, string[]>> {
    const enrollments = await this.prisma.challengeEnrollment.findMany({
      where: {
        userId: { in: [...userIds] },
        isActive: true,
        frequency: 'daily',
        challenge: { isActive: true },
      },
      select: { userId: true, challengeId: true },
    });

    if (enrollments.length === 0) {
      return new Map();
    }

    const completed = await this.prisma.userChallenge.findMany({
      where: {
        status: 'completed',
        periodKey: dayKey,
        OR: enrollments.map((enrollment) => ({
          userId: enrollment.userId,
          challengeId: enrollment.challengeId,
        })),
      },
      select: { userId: true, challengeId: true },
    });

    const completedKeys = new Set(
      completed.map((item) => `${item.userId}:${item.challengeId}`),
    );

    const byUserId = new Map<string, string[]>();

    for (const enrollment of enrollments) {
      if (completedKeys.has(`${enrollment.userId}:${enrollment.challengeId}`)) {
        continue;
      }

      const open = byUserId.get(enrollment.userId) ?? [];
      open.push(enrollment.challengeId);
      byUserId.set(enrollment.userId, open);
    }

    return byUserId;
  }

  private async excludeAlreadySentHabitSlots(
    candidates: readonly HabitSlotCandidate[],
  ): Promise<HabitSlotCandidate[]> {
    const keys = candidates.map((item) =>
      habitSlotIdempotencyKey(item.userId, item.dayKey, item.minuteOfDay),
    );

    const existing = await this.prisma.notification.findMany({
      where: { idempotencyKey: { in: keys } },
      select: { idempotencyKey: true },
    });

    const sent = new Set(existing.map((row) => row.idempotencyKey));

    return candidates.filter(
      (item) =>
        !sent.has(
          habitSlotIdempotencyKey(item.userId, item.dayKey, item.minuteOfDay),
        ),
    );
  }

  private async findDueInZone(timeZone: string, now: Date): Promise<DueReminder[]> {
    const localMinute = localMinuteOfDay(timeZone, now);
    const windowStart = localMinute - DISPATCH_CATCH_UP_MINUTES;

    const reminders = await this.prisma.challengeReminder.findMany({
      where: {
        // Clamping at zero rather than wrapping keeps a reminder set just after
        // midnight from firing again at the end of the previous day.
        minuteOfDay: { gte: Math.max(windowStart, 0), lte: localMinute },
        enrollment: {
          isActive: true,
          challenge: { isActive: true },
          user: { profile: { timeZone, reminderEnabled: true } },
        },
      },
      select: {
        id: true,
        enrollment: {
          select: {
            userId: true,
            challengeId: true,
            frequency: true,
            challenge: { select: { title: true } },
          },
        },
      },
    });

    return reminders.flatMap((reminder) => this.toDueReminder(reminder, timeZone, now));
  }

  /**
   * A weekly challenge is nudged on the first day of its period, not every day
   * of it, so a reminder only counts when today opens the period.
   */
  private toDueReminder(reminder: ReminderRow, timeZone: string, now: Date): DueReminder[] {
    const { enrollment } = reminder;
    const periodKey = periodKeyFor(enrollment.frequency, timeZone, now);
    const todayKey = periodKeyFor('daily', timeZone, now);

    if (periodKey !== todayKey) {
      return [];
    }

    return [
      {
        reminderId: reminder.id,
        userId: enrollment.userId,
        challengeId: enrollment.challengeId,
        challengeTitle: enrollment.challenge.title,
        frequency: enrollment.frequency,
        periodKey,
      },
    ];
  }

  private async excludeAlreadyDelivered(due: readonly DueReminder[]): Promise<DueReminder[]> {
    const delivered = await this.prisma.reminderDelivery.findMany({
      where: { reminderId: { in: due.map((item) => item.reminderId) } },
      select: { reminderId: true, periodKey: true },
    });

    const sentKeys = new Set(delivered.map((item) => `${item.reminderId}:${item.periodKey}`));

    return due.filter((item) => !sentKeys.has(`${item.reminderId}:${item.periodKey}`));
  }

  /** Nobody wants to be nudged about something they have already finished. */
  private async excludeCompleted(due: readonly DueReminder[]): Promise<DueReminder[]> {
    if (due.length === 0) {
      return [];
    }

    const completed = await this.prisma.userChallenge.findMany({
      where: {
        status: 'completed',
        OR: due.map((item) => ({
          userId: item.userId,
          challengeId: item.challengeId,
          periodKey: item.periodKey,
        })),
      },
      select: { userId: true, challengeId: true, periodKey: true },
    });

    const completedKeys = new Set(
      completed.map((item) => `${item.userId}:${item.challengeId}:${item.periodKey}`),
    );

    return due.filter(
      (item) => !completedKeys.has(`${item.userId}:${item.challengeId}:${item.periodKey}`),
    );
  }

  private async send(due: readonly DueReminder[]): Promise<number> {
    const tokensByUserId = await this.activeTokensByUserId(due.map((item) => item.userId));

    const messages: PushMessage[] = [];
    const deliverable: DueReminder[] = [];

    for (const item of due) {
      const tokens = tokensByUserId.get(item.userId) ?? [];

      // No device means nothing to send. Leaving the delivery unrecorded lets
      // it go out later the same period if the user registers one.
      if (tokens.length === 0) {
        continue;
      }

      deliverable.push(item);

      for (const expoPushToken of tokens) {
        messages.push({
          expoPushToken,
          title: CHALLENGE_REMINDER_PUSH_TITLE,
          body: item.challengeTitle,
          data: {
            destination: 'challenge',
            challengeId: item.challengeId,
            periodKey: item.periodKey,
          },
        });
      }
    }

    if (messages.length === 0) {
      return 0;
    }

    const result = await this.pushSender.send(messages);

    if (result.sentCount > 0) {
      await this.recordDeliveries(deliverable);
    }

    await this.pushDevices.deactivateTokens(result.rejectedTokens);

    this.logger.log(`Reminder dispatch sent ${result.sentCount} of ${messages.length} messages`);

    return result.sentCount;
  }

  private async activeTokensByUserId(userIds: readonly string[]): Promise<Map<string, string[]>> {
    const devices = await this.prisma.pushDevice.findMany({
      where: { userId: { in: [...new Set(userIds)] }, isActive: true },
      select: { userId: true, expoPushToken: true },
    });

    const byUserId = new Map<string, string[]>();

    for (const device of devices) {
      const tokens = byUserId.get(device.userId) ?? [];
      tokens.push(device.expoPushToken);
      byUserId.set(device.userId, tokens);
    }

    return byUserId;
  }

  private async recordDeliveries(due: readonly DueReminder[]): Promise<void> {
    await this.prisma.reminderDelivery.createMany({
      data: due.map((item) => ({
        reminderId: item.reminderId,
        periodKey: item.periodKey,
      })),
      // Two overlapping runs can reach this point together; the unique key
      // decides which one wins and the other becomes a no-op.
      skipDuplicates: true,
    });

    // The designed inbox is the in-app counterpart of the push. Same key as
    // the delivery row, so a retry never duplicates the list item.
    await this.prisma.notification.createMany({
      data: due.map((item) => ({
        userId: item.userId,
        kind: 'reminder' as const,
        title: CHALLENGE_REMINDER_PUSH_TITLE,
        body: item.challengeTitle,
        idempotencyKey: `reminder:${item.reminderId}:${item.periodKey}`,
      })),
      skipDuplicates: true,
    });
  }

  /**
   * One finish nudge per started occurrence, after the member's delay.
   * Reuses the same Expo pipeline as clock reminders.
   */
  async dispatchInProgressNudges(now: Date = new Date()): Promise<DispatchSummaryDto> {
    const candidates = await this.prisma.userChallenge.findMany({
      where: {
        status: { in: ['in_progress', 'awaiting_evidence'] },
        startedAt: { not: null },
        inProgressNudgeDelivery: { is: null },
        user: {
          profile: {
            inProgressNudgeEnabled: true,
            ...(isTestingMembershipEnabled() ? {} : { membershipActive: true as const }),
          },
        },
      },
      select: {
        id: true,
        userId: true,
        challengeId: true,
        periodKey: true,
        startedAt: true,
        challenge: { select: { title: true } },
        user: {
          select: {
            profile: { select: { inProgressNudgeDelayMinutes: true } },
          },
        },
      },
    });

    const due = candidates.filter((item) => {
      if (!item.startedAt) {
        return false;
      }

      const delayMinutes = item.user.profile?.inProgressNudgeDelayMinutes ?? 30;
      const readyAt = item.startedAt.getTime() + delayMinutes * 60_000;
      return readyAt <= now.getTime();
    });

    if (due.length === 0) {
      return { dueCount: 0, sentCount: 0, suppressedCount: 0 };
    }

    const tokensByUserId = await this.activeTokensByUserId(due.map((item) => item.userId));
    const messages: PushMessage[] = [];
    const deliverable: typeof due = [];

    for (const item of due) {
      const tokens = tokensByUserId.get(item.userId) ?? [];
      if (tokens.length === 0) {
        continue;
      }

      deliverable.push(item);
      for (const expoPushToken of tokens) {
        messages.push({
          expoPushToken,
          title: IN_PROGRESS_NUDGE_PUSH_TITLE,
          body: IN_PROGRESS_NUDGE_PUSH_BODY,
          data: {
            destination: 'challenge',
            challengeId: item.challengeId,
            periodKey: item.periodKey,
          },
        });
      }
    }

    if (messages.length === 0) {
      return { dueCount: due.length, sentCount: 0, suppressedCount: 0 };
    }

    const result = await this.pushSender.send(messages);

    if (result.sentCount > 0) {
      await this.prisma.inProgressNudgeDelivery.createMany({
        data: deliverable.map((item) => ({ userChallengeId: item.id })),
        skipDuplicates: true,
      });

      await this.prisma.notification.createMany({
        data: deliverable.map((item) => ({
          userId: item.userId,
          kind: 'reminder' as const,
          title: IN_PROGRESS_NUDGE_PUSH_TITLE,
          body: IN_PROGRESS_NUDGE_PUSH_BODY,
          idempotencyKey: `in_progress_nudge:${item.id}`,
        })),
        skipDuplicates: true,
      });
    }

    await this.pushDevices.deactivateTokens(result.rejectedTokens);

    return {
      dueCount: due.length,
      sentCount: result.sentCount,
      suppressedCount: due.length - deliverable.length,
    };
  }
}
