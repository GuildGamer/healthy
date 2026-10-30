import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ChallengeFrequency, PrismaClient } from '@product/db';
import { DISPATCH_CATCH_UP_MINUTES } from '../../../../shared/constants/reminder-defaults.js';
import { isTestingMembershipEnabled } from '../../../../shared/membership/testing-membership.js';
import { dayKeyFor, localMinuteOfDay } from '../../../../shared/utils/day-key.js';
import { periodKeyFor } from '../../../../shared/utils/period-key.js';
import { PRISMA } from '../../database/prisma.tokens.js';
import {
  CHALLENGE_REMINDER_PUSH_TITLE,
  HABIT_SLOT_MINUTES,
  habitSlotCopy,
  habitSlotIdempotencyKey,
  IN_PROGRESS_NUDGE_PUSH_BODY,
  IN_PROGRESS_NUDGE_PUSH_TITLE,
} from '../constants/habit-slot-copy.js';
import { composeReminderCopy } from '../copy/compose-reminder-copy.js';
import {
  contextKey,
  ReminderContextLoaderService,
  type ReminderContextRequest,
} from '../copy/reminder-context-loader.service.js';
import { moreOpenSuffix } from '../policy/pick-lead-challenge.js';
import type { DispatchSummaryDto } from '../dto/dispatch-summary.dto.js';
import { EngagementDeliveryService } from '../engagement-delivery.service.js';
import {
  EngagementPolicyService,
  type CadencePlan,
} from '../policy/engagement-policy.service.js';
import { isTreatmentVariant } from '../policy/habit-slot-minutes-for.js';
import type { EngagementPush } from '../types/engagement-push.js';

/** A reminder whose minute has arrived, resolved against its period. */
type DueReminder = {
  reminderId: string;
  userId: string;
  challengeId: string;
  challengeTitle: string;
  frequency: ChallengeFrequency;
  periodKey: string;
};

/** One push per person: the lead reminder carries the copy, every member is marked delivered. */
type DueReminderGroup = {
  userId: string;
  lead: DueReminder;
  members: DueReminder[];
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

type HabitSlotPrepared = HabitSlotCandidate & {
  title: string;
  body: string;
  leadChallengeId: string | undefined;
  templateKey?: string;
  situation?: string;
  copyVersion?: string;
  /** Set when the copy is about a group; the push then opens its board. */
  matchId?: string;
};

/**
 * Where a reminder lands. Group copy opens the board, and the inbox row carries
 * the match id, which is what counts it as that group's push for the day.
 */
function reminderDestination(
  matchId: string | undefined,
  fallback: Record<string, string>,
): Record<string, string> {
  return matchId ? { matchId } : fallback;
}

export type HabitSlotDispatchSummary = DispatchSummaryDto & {
  /** Users who received a habit slot this run — skip their same-minute reminders. */
  sentUserIds: string[];
};

@Injectable()
export class ReminderDispatcherService {
  private readonly logger = new Logger(ReminderDispatcherService.name);

  constructor(
    @Inject(PRISMA) private readonly prisma: PrismaClient,
    private readonly delivery: EngagementDeliveryService,
    private readonly policy: EngagementPolicyService,
    private readonly contexts: ReminderContextLoaderService,
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

    const plans = await this.policy.cadencePlanFor(
      undelivered.map((item) => item.userId),
      now,
    );

    const allowed = undelivered.filter((item) => {
      const plan = plans.get(item.userId);
      if (!plan) {
        return true;
      }

      if (!plan.habitMinutes.includes(item.minuteOfDay)) {
        return false;
      }

      if (plan.quietNow || plan.remainingBudget < 1 || plan.skipHabitForActivity) {
        return false;
      }

      return true;
    });

    const budgeted: Array<{
      item: HabitSlotCandidate;
      plan: CadencePlan | undefined;
      slotCopy: NonNullable<ReturnType<typeof habitSlotCopy>>;
    }> = [];
    const spentThisTick = new Map<string, number>();

    for (const item of allowed) {
      const slotCopy = habitSlotCopy(item.minuteOfDay);
      if (!slotCopy) {
        continue;
      }

      const plan = plans.get(item.userId);
      const alreadySpent = spentThisTick.get(item.userId) ?? 0;
      const remaining =
        (plan?.remainingBudget ?? Number.POSITIVE_INFINITY) - alreadySpent;
      if (remaining < 1) {
        continue;
      }

      budgeted.push({ item, plan, slotCopy });
      spentThisTick.set(item.userId, alreadySpent + 1);
    }

    const leadByUser = new Map<string, string | undefined>();
    for (const entry of budgeted) {
      if (!isTreatmentVariant(entry.plan?.variantKey)) {
        leadByUser.set(
          entry.item.userId,
          entry.item.openChallengeIds.length === 1
            ? entry.item.openChallengeIds[0]
            : undefined,
        );
        continue;
      }

      const { leadChallengeId } = await this.policy.pickLeadForOpenChallenges({
        userId: entry.item.userId,
        openChallengeIds: entry.item.openChallengeIds,
        timeZone: entry.item.timeZone,
        now,
      });
      leadByUser.set(entry.item.userId, leadChallengeId ?? undefined);
    }

    const treatmentRequests: ReminderContextRequest[] = budgeted
      .filter((entry) => isTreatmentVariant(entry.plan?.variantKey))
      .map((entry) => ({
        userId: entry.item.userId,
        dayKey: entry.item.dayKey,
        localMinute: entry.item.minuteOfDay,
        timeZone: entry.item.timeZone,
        nudgeKind: 'habit_slot' as const,
        openChallengeIds: entry.item.openChallengeIds,
        leadChallengeId: leadByUser.get(entry.item.userId) ?? null,
      }));

    const treatmentContexts =
      treatmentRequests.length === 0
        ? new Map()
        : await this.contexts.loadMany(treatmentRequests, now);

    const prepared: HabitSlotPrepared[] = [];
    const pushes: EngagementPush[] = [];

    for (const entry of budgeted) {
      const leadChallengeId = leadByUser.get(entry.item.userId);
      const openSuffix = isTreatmentVariant(entry.plan?.variantKey)
        ? moreOpenSuffix(entry.item.openChallengeIds.length)
        : '';

      let title = entry.slotCopy.title;
      let body = `${entry.slotCopy.body}${openSuffix}`;
      let templateKey: string | undefined;
      let situation: string | undefined;
      let copyVersion: string | undefined;
      let matchId: string | undefined;

      if (isTreatmentVariant(entry.plan?.variantKey)) {
        const loaded = treatmentContexts.get(
          contextKey({
            userId: entry.item.userId,
            nudgeKind: 'habit_slot',
            leadChallengeId: leadChallengeId ?? null,
            userChallengeId: null,
          }),
        );
        if (loaded) {
          const composed = composeReminderCopy(loaded);
          matchId = composed.matchId ?? undefined;
          title = composed.title;
          // "+2 more" counts today's challenges, which group copy is not about.
          body = matchId ? composed.body : `${composed.body}${openSuffix}`;
          templateKey = composed.templateKey;
          situation = composed.situation;
          copyVersion = composed.copyVersion;
        }
      }

      prepared.push({
        ...entry.item,
        title,
        body,
        leadChallengeId,
        templateKey,
        situation,
        copyVersion,
        matchId,
      });

      const data = reminderDestination(matchId, {
        destination: 'today',
        ...(leadChallengeId ? { challengeId: leadChallengeId } : {}),
      });

      pushes.push({
        userId: entry.item.userId,
        title,
        body,
        data,
        leadChallengeId,
        templateKey,
        situation,
        copyVersion,
      });
    }

    if (pushes.length === 0) {
      return {
        dueCount: candidates.length,
        sentCount: 0,
        suppressedCount: undelivered.length,
        sentUserIds: [],
      };
    }

    const result = await this.delivery.send({
      source: 'habit_slot',
      audience: 'all_devices',
      pushes,
    });

    const withDevice = new Set(result.usersWithDevice);
    const deliverable = prepared.filter((item) => withDevice.has(item.userId));

    if (result.sentCount > 0) {
      await this.prisma.notification.createMany({
        data: deliverable.map((item) => ({
          userId: item.userId,
          kind: 'reminder' as const,
          title: item.title,
          body: item.body,
          payload: reminderDestination(item.matchId, {
            destination: 'today',
            ...(item.leadChallengeId
              ? { challengeId: item.leadChallengeId }
              : {}),
          }),
          idempotencyKey: habitSlotIdempotencyKey(
            item.userId,
            item.dayKey,
            item.minuteOfDay,
          ),
        })),
        skipDuplicates: true,
      });
    }

    return {
      dueCount: candidates.length,
      sentCount: result.sentCount,
      suppressedCount: undelivered.length - deliverable.length,
      sentUserIds: deliverable.map((item) => item.userId),
    };
  }

  /**
   * Sends one clock reminder per person whose local minute has arrived and
   * whose period is still open. Several enrolments at the same minute share
   * one push; every reminder in the group is marked delivered so a retry
   * cannot fire the rest a minute later.
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
    const groups = await this.assignClockLeads(this.groupDueByUser(outstanding), now);
    const policySuppressed = await this.applyCadenceBudget(
      groups,
      now,
      (item) => item.userId,
    );
    const allowedMemberCount = policySuppressed.allowed.reduce(
      (count, group) => count + group.members.length,
      0,
    );
    const suppressedCount =
      undelivered.length - outstanding.length + (outstanding.length - allowedMemberCount);

    if (policySuppressed.allowed.length === 0) {
      return { dueCount: due.length, sentCount: 0, suppressedCount };
    }

    const sentCount = await this.sendClockReminders(
      policySuppressed.allowed,
      policySuppressed.plans,
      now,
    );

    return { dueCount: due.length, sentCount, suppressedCount };
  }

  /** Buckets due reminders by person so each person gets at most one push. */
  private groupDueByUser(
    due: readonly DueReminder[],
  ): Map<string, DueReminder[]> {
    const byUser = new Map<string, DueReminder[]>();

    for (const item of due) {
      const members = byUser.get(item.userId) ?? [];
      members.push(item);
      byUser.set(item.userId, members);
    }

    return byUser;
  }

  /**
   * Treatment picks the lead challenge; holdout keeps enrolment order.
   * The lead is the only reminder that shapes the push copy.
   */
  private async assignClockLeads(
    byUser: Map<string, DueReminder[]>,
    now: Date,
  ): Promise<DueReminderGroup[]> {
    if (byUser.size === 0) {
      return [];
    }

    const plans = await this.policy.cadencePlanFor([...byUser.keys()], now);
    const groups: DueReminderGroup[] = [];

    for (const [userId, members] of byUser) {
      const first = members[0];
      if (!first) {
        continue;
      }

      let lead = first;
      const plan = plans.get(userId);
      if (isTreatmentVariant(plan?.variantKey) && members.length > 1) {
        const { leadChallengeId } = await this.policy.pickLeadForOpenChallenges({
          userId,
          openChallengeIds: members.map((member) => member.challengeId),
          timeZone: plan?.timeZone ?? 'UTC',
          now,
        });
        lead =
          members.find((member) => member.challengeId === leadChallengeId) ??
          first;
      }

      groups.push({ userId, lead, members });
    }

    return groups;
  }

  /**
   * Treatment: quiet hours and remaining daily budget. Holdout / unassigned
   * pass through unchanged. Caps each user to their remaining sends.
   */
  private async applyCadenceBudget<T>(
    items: readonly T[],
    now: Date,
    userIdOf: (item: T) => string,
  ): Promise<{
    allowed: T[];
    suppressed: number;
    plans: Map<string, CadencePlan>;
  }> {
    if (items.length === 0) {
      return { allowed: [], suppressed: 0, plans: new Map() };
    }

    const plans = await this.policy.cadencePlanFor(
      items.map(userIdOf),
      now,
    );
    const spentThisTick = new Map<string, number>();
    const allowed: T[] = [];

    for (const item of items) {
      const userId = userIdOf(item);
      const plan = plans.get(userId);
      if (!plan || !isTreatmentVariant(plan.variantKey)) {
        allowed.push(item);
        continue;
      }

      if (plan.quietNow) {
        continue;
      }

      const alreadySpent = spentThisTick.get(userId) ?? 0;
      if (plan.remainingBudget - alreadySpent < 1) {
        continue;
      }

      allowed.push(item);
      spentThisTick.set(userId, alreadySpent + 1);
    }

    return {
      allowed,
      suppressed: items.length - allowed.length,
      plans,
    };
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

  private async sendClockReminders(
    groups: readonly DueReminderGroup[],
    plans: Map<string, CadencePlan>,
    now: Date,
  ): Promise<number> {
    const treatmentRequests: ReminderContextRequest[] = groups
      .filter((group) => isTreatmentVariant(plans.get(group.userId)?.variantKey))
      .map((group) => {
        const plan = plans.get(group.userId);
        return {
          userId: group.userId,
          dayKey: plan?.dayKey ?? dayKeyFor(plan?.timeZone ?? 'UTC', now),
          localMinute:
            plan?.localMinute ?? localMinuteOfDay(plan?.timeZone ?? 'UTC', now),
          timeZone: plan?.timeZone ?? 'UTC',
          nudgeKind: 'clock_reminder' as const,
          openChallengeIds: group.members.map((member) => member.challengeId),
          leadChallengeId: group.lead.challengeId,
        };
      });

    const treatmentContexts =
      treatmentRequests.length === 0
        ? new Map()
        : await this.contexts.loadMany(treatmentRequests, now);

    type PreparedClock = DueReminder & {
      title: string;
      body: string;
      templateKey?: string;
      situation?: string;
      copyVersion?: string;
      matchId?: string;
      members: DueReminder[];
    };

    const prepared: PreparedClock[] = groups.map((group) => {
      const plan = plans.get(group.userId);
      const openSuffix = isTreatmentVariant(plan?.variantKey)
        ? moreOpenSuffix(group.members.length)
        : '';

      if (!isTreatmentVariant(plan?.variantKey)) {
        return {
          ...group.lead,
          title: CHALLENGE_REMINDER_PUSH_TITLE,
          body: group.lead.challengeTitle,
          members: group.members,
        };
      }

      const loaded = treatmentContexts.get(
        contextKey({
          userId: group.userId,
          nudgeKind: 'clock_reminder',
          leadChallengeId: group.lead.challengeId,
          userChallengeId: null,
        }),
      );
      if (!loaded) {
        return {
          ...group.lead,
          title: CHALLENGE_REMINDER_PUSH_TITLE,
          body: `${group.lead.challengeTitle}${openSuffix}`,
          members: group.members,
        };
      }

      const composed = composeReminderCopy(loaded);
      const matchId = composed.matchId ?? undefined;
      return {
        ...group.lead,
        title: composed.title,
        body: matchId ? composed.body : `${composed.body}${openSuffix}`,
        templateKey: composed.templateKey,
        situation: composed.situation,
        copyVersion: composed.copyVersion,
        matchId,
        members: group.members,
      };
    });

    const pushes: EngagementPush[] = prepared.map((item) => ({
      userId: item.userId,
      title: item.title,
      body: item.body,
      data: reminderDestination(item.matchId, {
        destination: 'challenge',
        challengeId: item.challengeId,
        periodKey: item.periodKey,
      }),
      leadChallengeId: item.challengeId,
      templateKey: item.templateKey,
      situation: item.situation,
      copyVersion: item.copyVersion,
    }));

    const result = await this.delivery.send({
      source: 'clock_reminder',
      audience: 'all_devices',
      pushes,
    });

    const withDevice = new Set(result.usersWithDevice);
    const deliverable = prepared.filter((item) => withDevice.has(item.userId));

    if (result.sentCount > 0) {
      await this.recordClockDeliveries(deliverable);
    }

    return result.sentCount;
  }

  private async recordClockDeliveries(
    due: ReadonlyArray<
      DueReminder & {
        title: string;
        body: string;
        matchId?: string;
        members: DueReminder[];
      }
    >,
  ): Promise<void> {
    await this.prisma.reminderDelivery.createMany({
      data: due.flatMap((item) =>
        item.members.map((member) => ({
          reminderId: member.reminderId,
          periodKey: member.periodKey,
        })),
      ),
      // Two overlapping runs can reach this point together; the unique key
      // decides which one wins and the other becomes a no-op.
      skipDuplicates: true,
    });

    // One inbox row per person, keyed on the lead reminder.
    await this.prisma.notification.createMany({
      data: due.map((item) => ({
        userId: item.userId,
        kind: 'reminder' as const,
        title: item.title,
        body: item.body,
        payload: reminderDestination(item.matchId, {
          destination: 'challenge',
          challengeId: item.challengeId,
        }),
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

    const budgeted = await this.applyCadenceBudget(due, now, (item) => item.userId);
    if (budgeted.allowed.length === 0) {
      return {
        dueCount: due.length,
        sentCount: 0,
        suppressedCount: budgeted.suppressed,
      };
    }

    const treatmentRequests: ReminderContextRequest[] = budgeted.allowed
      .filter((item) =>
        isTreatmentVariant(budgeted.plans.get(item.userId)?.variantKey),
      )
      .map((item) => {
        const plan = budgeted.plans.get(item.userId);
        return {
          userId: item.userId,
          dayKey: plan?.dayKey ?? dayKeyFor(plan?.timeZone ?? 'UTC', now),
          localMinute:
            plan?.localMinute ?? localMinuteOfDay(plan?.timeZone ?? 'UTC', now),
          timeZone: plan?.timeZone ?? 'UTC',
          nudgeKind: 'in_progress_nudge' as const,
          openChallengeIds: [item.challengeId],
          leadChallengeId: item.challengeId,
          userChallengeId: item.id,
        };
      });

    const treatmentContexts =
      treatmentRequests.length === 0
        ? new Map()
        : await this.contexts.loadMany(treatmentRequests, now);

    type PreparedNudge = (typeof budgeted.allowed)[number] & {
      title: string;
      body: string;
      templateKey?: string;
      situation?: string;
      copyVersion?: string;
    };

    const prepared: PreparedNudge[] = budgeted.allowed.map((item) => {
      const plan = budgeted.plans.get(item.userId);
      if (!isTreatmentVariant(plan?.variantKey)) {
        return {
          ...item,
          title: IN_PROGRESS_NUDGE_PUSH_TITLE,
          body: IN_PROGRESS_NUDGE_PUSH_BODY,
        };
      }

      const loaded = treatmentContexts.get(
        contextKey({
          userId: item.userId,
          nudgeKind: 'in_progress_nudge',
          leadChallengeId: item.challengeId,
          userChallengeId: item.id,
        }),
      );
      if (!loaded) {
        return {
          ...item,
          title: IN_PROGRESS_NUDGE_PUSH_TITLE,
          body: IN_PROGRESS_NUDGE_PUSH_BODY,
        };
      }

      const composed = composeReminderCopy(loaded);
      return {
        ...item,
        title: composed.title,
        body: composed.body,
        templateKey: composed.templateKey,
        situation: composed.situation,
        copyVersion: composed.copyVersion,
      };
    });

    const pushes: EngagementPush[] = prepared.map((item) => ({
      userId: item.userId,
      title: item.title,
      body: item.body,
      data: {
        destination: 'challenge',
        challengeId: item.challengeId,
        periodKey: item.periodKey,
      },
      leadChallengeId: item.challengeId,
      templateKey: item.templateKey,
      situation: item.situation,
      copyVersion: item.copyVersion,
    }));

    const result = await this.delivery.send({
      source: 'in_progress_nudge',
      audience: 'all_devices',
      pushes,
    });

    const withDevice = new Set(result.usersWithDevice);
    const deliverable = prepared.filter((item) => withDevice.has(item.userId));

    if (result.sentCount > 0) {
      await this.prisma.inProgressNudgeDelivery.createMany({
        data: deliverable.map((item) => ({ userChallengeId: item.id })),
        skipDuplicates: true,
      });

      await this.prisma.notification.createMany({
        data: deliverable.map((item) => ({
          userId: item.userId,
          kind: 'reminder' as const,
          title: item.title,
          body: item.body,
          payload: {
            destination: 'challenge' as const,
            challengeId: item.challengeId,
          },
          idempotencyKey: `in_progress_nudge:${item.id}`,
        })),
        skipDuplicates: true,
      });
    }

    return {
      dueCount: due.length,
      sentCount: result.sentCount,
      suppressedCount:
        budgeted.suppressed + (prepared.length - deliverable.length),
    };
  }
}
