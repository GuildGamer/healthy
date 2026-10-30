import { describe, expect, it, vi } from 'vitest';
import { HABIT_SLOT_MINUTES } from '../constants/habit-slot-copy.js';
import { TREATMENT_HABIT_SLOT_MINUTES } from '../policy/constants.js';
import type { ReminderContext } from '../copy/types.js';
import type { CadencePlan } from '../policy/engagement-policy.service.js';
import type { EngagementSendInput } from '../types/engagement-push.js';
import { ReminderDispatcherService } from './reminder-dispatcher.service.js';

function createPrismaMock(options: {
  zones?: string[];
  profiles?: Array<{ userId: string; timeZone: string }>;
  enrollments?: Array<{ userId: string; challengeId: string }>;
  reminders?: Array<{
    id: string;
    userId: string;
    challengeId: string;
    title: string;
    frequency: 'daily' | 'weekly' | 'monthly';
  }>;
  delivered?: Array<{ reminderId: string; periodKey: string }>;
  completed?: Array<{
    userId: string;
    challengeId: string;
    periodKey: string;
  }>;
  sentHabitKeys?: string[];
  inProgress?: Array<{
    id: string;
    userId: string;
    challengeId: string;
    periodKey: string;
    startedAt: Date;
    delayMinutes?: number;
  }>;
}) {
  const zones =
    options.zones ??
    [...new Set((options.profiles ?? []).map((profile) => profile.timeZone))];

  return {
    userProfile: {
      findMany: vi.fn().mockImplementation(async (query: {
        where?: { reminderEnabled?: boolean; timeZone?: string };
        distinct?: string[];
        select?: { timeZone?: boolean; userId?: boolean };
      }) => {
        if (query.distinct?.includes('timeZone')) {
          return zones.map((timeZone) => ({ timeZone }));
        }

        const timeZone = query.where?.timeZone;
        return (options.profiles ?? [])
          .filter((profile) => !timeZone || profile.timeZone === timeZone)
          .map((profile) => ({ userId: profile.userId }));
      }),
    },
    challengeEnrollment: {
      findMany: vi.fn().mockResolvedValue(options.enrollments ?? []),
    },
    challengeReminder: {
      findMany: vi.fn().mockResolvedValue(
        (options.reminders ?? []).map((reminder) => ({
          id: reminder.id,
          enrollment: {
            userId: reminder.userId,
            challengeId: reminder.challengeId,
            frequency: reminder.frequency,
            challenge: { title: reminder.title },
          },
        })),
      ),
    },
    reminderDelivery: {
      findMany: vi.fn().mockResolvedValue(options.delivered ?? []),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    userChallenge: {
      findMany: vi.fn().mockImplementation(async (query: {
        where?: { status?: unknown; inProgressNudgeDelivery?: unknown };
      }) => {
        if (query.where?.inProgressNudgeDelivery) {
          return (options.inProgress ?? []).map((item) => ({
            id: item.id,
            userId: item.userId,
            challengeId: item.challengeId,
            periodKey: item.periodKey,
            startedAt: item.startedAt,
            challenge: { title: 'Walk' },
            user: {
              profile: {
                inProgressNudgeDelayMinutes: item.delayMinutes ?? 30,
              },
            },
          }));
        }

        return options.completed ?? [];
      }),
    },
    notification: {
      findMany: vi.fn().mockResolvedValue(
        (options.sentHabitKeys ?? []).map((idempotencyKey) => ({
          idempotencyKey,
        })),
      ),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    inProgressNudgeDelivery: {
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  };
}

function createDelivery(options?: {
  sentCount?: number;
  usersWithDevice?: string[];
  usersWithoutDevice?: string[];
}) {
  return {
    send: vi.fn().mockImplementation(async (input: EngagementSendInput) => {
      const userIds = [...new Set(input.pushes.map((push) => push.userId))];
      const usersWithDevice = options?.usersWithDevice ?? userIds;
      const usersWithoutDevice =
        options?.usersWithoutDevice ??
        userIds.filter((userId) => !usersWithDevice.includes(userId));

      const deliveryIdsByUserId: Record<string, string> = {};
      for (const userId of usersWithDevice) {
        deliveryIdsByUserId[userId] = `delivery-${userId}`;
      }

      return {
        sentCount: options?.sentCount ?? usersWithDevice.length,
        messageCount: usersWithDevice.length,
        usersWithDevice,
        usersWithoutDevice,
        deliveryIdsByUserId,
      };
    }),
  };
}

function holdoutSafePlan(
  overrides: Partial<CadencePlan> = {},
): CadencePlan {
  return {
    variantKey: 'holdout',
    habitMinutes: HABIT_SLOT_MINUTES,
    remainingBudget: Number.POSITIVE_INFINITY,
    skipHabitForActivity: false,
    quietNow: false,
    timeZone: 'UTC',
    dayKey: '2026-08-29',
    localMinute: 8 * 60,
    ...overrides,
  };
}

function treatmentPlan(overrides: Partial<CadencePlan> = {}): CadencePlan {
  return {
    variantKey: 'treatment',
    habitMinutes: TREATMENT_HABIT_SLOT_MINUTES,
    remainingBudget: 3,
    skipHabitForActivity: false,
    quietNow: false,
    timeZone: 'UTC',
    dayKey: '2026-08-29',
    localMinute: 8 * 60,
    ...overrides,
  };
}

function createPolicy(options?: {
  plans?: Map<string, CadencePlan>;
  lead?: { leadChallengeId: string | null; bodySuffix: string };
}) {
  const defaultPlan = holdoutSafePlan();
  return {
    cadencePlanFor: vi.fn().mockImplementation(async (userIds: string[]) => {
      const map = new Map<string, CadencePlan>();
      for (const userId of userIds) {
        map.set(userId, options?.plans?.get(userId) ?? defaultPlan);
      }
      return map;
    }),
    pickLeadForOpenChallenges: vi.fn().mockResolvedValue(
      options?.lead ?? { leadChallengeId: null, bodySuffix: '' },
    ),
  };
}

function createContexts(options?: { contexts?: Map<string, ReminderContext> }) {
  return {
    loadMany: vi.fn().mockResolvedValue(options?.contexts ?? new Map()),
  };
}

describe('ReminderDispatcherService', () => {
  it('returns zeros when nobody has reminders enabled', async () => {
    const service = new ReminderDispatcherService(
      createPrismaMock({}) as never,
      createDelivery() as never,
      createPolicy() as never,
      createContexts() as never,
    );

    await expect(service.dispatchDue()).resolves.toEqual({
      dueCount: 0,
      sentCount: 0,
      suppressedCount: 0,
    });
  });

  it('does not nudge a challenge that is already done this period', async () => {
    const today = new Date('2026-08-29T16:00:00.000Z');
    const prisma = createPrismaMock({
      zones: ['UTC'],
      reminders: [
        {
          id: 'r1',
          userId: 'u1',
          challengeId: 'c1',
          title: 'Walk',
          frequency: 'daily',
        },
      ],
      completed: [{ userId: 'u1', challengeId: 'c1', periodKey: '2026-08-29' }],
    });

    prisma.challengeReminder.findMany = vi.fn().mockResolvedValue([
      {
        id: 'r1',
        enrollment: {
          userId: 'u1',
          challengeId: 'c1',
          frequency: 'daily',
          challenge: { title: 'Walk' },
        },
      },
    ]);

    const delivery = createDelivery();
    const service = new ReminderDispatcherService(
      prisma as never,
      delivery as never,
      createPolicy() as never,
      createContexts() as never,
    );

    await expect(service.dispatchDue(today)).resolves.toEqual({
      dueCount: 1,
      sentCount: 0,
      suppressedCount: 1,
    });
    expect(delivery.send).not.toHaveBeenCalled();
  });

  it('sends, records delivery, and writes an inbox row', async () => {
    const today = new Date('2026-08-29T19:05:00.000Z');
    const prisma = createPrismaMock({
      zones: ['UTC'],
      reminders: [
        {
          id: 'r1',
          userId: 'u1',
          challengeId: 'c1',
          title: 'Walk',
          frequency: 'daily',
        },
      ],
    });

    const delivery = createDelivery({ sentCount: 1, usersWithDevice: ['u1'] });
    const service = new ReminderDispatcherService(
      prisma as never,
      delivery as never,
      createPolicy() as never,
      createContexts() as never,
    );

    await expect(service.dispatchDue(today)).resolves.toEqual({
      dueCount: 1,
      sentCount: 1,
      suppressedCount: 0,
    });

    expect(delivery.send).toHaveBeenCalledWith({
      source: 'clock_reminder',
      audience: 'all_devices',
      pushes: [
        {
          userId: 'u1',
          title: 'Do one now',
          body: 'Walk',
          data: {
            destination: 'challenge',
            challengeId: 'c1',
            periodKey: '2026-08-29',
          },
          leadChallengeId: 'c1',
        },
      ],
    });
    expect(prisma.reminderDelivery.createMany).toHaveBeenCalledWith({
      data: [{ reminderId: 'r1', periodKey: '2026-08-29' }],
      skipDuplicates: true,
    });
    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: 'u1',
          kind: 'reminder',
          title: 'Do one now',
          body: 'Walk',
          payload: {
            destination: 'challenge',
            challengeId: 'c1',
          },
          idempotencyKey: 'reminder:r1:2026-08-29',
        },
      ],
      skipDuplicates: true,
    });
  });

  it('sends one push when two reminders share a person and minute', async () => {
    const today = new Date('2026-08-29T19:05:00.000Z');
    const prisma = createPrismaMock({
      zones: ['UTC'],
      reminders: [
        {
          id: 'r1',
          userId: 'u1',
          challengeId: 'c1',
          title: 'Walk',
          frequency: 'daily',
        },
        {
          id: 'r2',
          userId: 'u1',
          challengeId: 'c2',
          title: 'Push-ups',
          frequency: 'daily',
        },
      ],
    });
    const delivery = createDelivery({ sentCount: 1, usersWithDevice: ['u1'] });
    const service = new ReminderDispatcherService(
      prisma as never,
      delivery as never,
      createPolicy() as never,
      createContexts() as never,
    );

    await expect(service.dispatchDue(today)).resolves.toEqual({
      dueCount: 2,
      sentCount: 1,
      suppressedCount: 0,
    });

    expect(delivery.send).toHaveBeenCalledTimes(1);
    expect(delivery.send.mock.calls[0]?.[0].pushes).toHaveLength(1);
    expect(prisma.reminderDelivery.createMany).toHaveBeenCalledWith({
      data: [
        { reminderId: 'r1', periodKey: '2026-08-29' },
        { reminderId: 'r2', periodKey: '2026-08-29' },
      ],
      skipDuplicates: true,
    });
    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: 'u1',
          kind: 'reminder',
          title: 'Do one now',
          body: 'Walk',
          payload: {
            destination: 'challenge',
            challengeId: 'c1',
          },
          idempotencyKey: 'reminder:r1:2026-08-29',
        },
      ],
      skipDuplicates: true,
    });
  });

  it('does not resend after every reminder in the group was marked delivered', async () => {
    const today = new Date('2026-08-29T19:05:00.000Z');
    const prisma = createPrismaMock({
      zones: ['UTC'],
      reminders: [
        {
          id: 'r1',
          userId: 'u1',
          challengeId: 'c1',
          title: 'Walk',
          frequency: 'daily',
        },
        {
          id: 'r2',
          userId: 'u1',
          challengeId: 'c2',
          title: 'Push-ups',
          frequency: 'daily',
        },
      ],
      delivered: [
        { reminderId: 'r1', periodKey: '2026-08-29' },
        { reminderId: 'r2', periodKey: '2026-08-29' },
      ],
    });
    const delivery = createDelivery();
    const service = new ReminderDispatcherService(
      prisma as never,
      delivery as never,
      createPolicy() as never,
      createContexts() as never,
    );

    await expect(service.dispatchDue(today)).resolves.toEqual({
      dueCount: 2,
      sentCount: 0,
      suppressedCount: 0,
    });
    expect(delivery.send).not.toHaveBeenCalled();
  });

  it('still sends one push per person when several people are due', async () => {
    const today = new Date('2026-08-29T19:05:00.000Z');
    const prisma = createPrismaMock({
      zones: ['UTC'],
      reminders: [
        {
          id: 'r1',
          userId: 'u1',
          challengeId: 'c1',
          title: 'Walk',
          frequency: 'daily',
        },
        {
          id: 'r2',
          userId: 'u2',
          challengeId: 'c2',
          title: 'Push-ups',
          frequency: 'daily',
        },
      ],
    });
    const delivery = createDelivery({
      sentCount: 2,
      usersWithDevice: ['u1', 'u2'],
    });
    const service = new ReminderDispatcherService(
      prisma as never,
      delivery as never,
      createPolicy() as never,
      createContexts() as never,
    );

    await expect(service.dispatchDue(today)).resolves.toEqual({
      dueCount: 2,
      sentCount: 2,
      suppressedCount: 0,
    });
    expect(delivery.send.mock.calls[0]?.[0].pushes).toHaveLength(2);
  });

  it('sends one habit slot while a daily challenge is still open', async () => {
    const morning = new Date('2026-08-29T08:02:00.000Z');
    const prisma = createPrismaMock({
      profiles: [{ userId: 'u1', timeZone: 'UTC' }],
      enrollments: [{ userId: 'u1', challengeId: 'c1' }],
    });
    const delivery = createDelivery({ sentCount: 1, usersWithDevice: ['u1'] });
    const service = new ReminderDispatcherService(
      prisma as never,
      delivery as never,
      createPolicy() as never,
      createContexts() as never,
    );

    await expect(service.dispatchHabitSlots(morning)).resolves.toEqual({
      dueCount: 1,
      sentCount: 1,
      suppressedCount: 0,
      sentUserIds: ['u1'],
    });

    expect(delivery.send).toHaveBeenCalledWith({
      source: 'habit_slot',
      audience: 'all_devices',
      pushes: [
        expect.objectContaining({
          userId: 'u1',
          title: "Start today's challenge",
          body: "Today's on you",
          data: { destination: 'today', challengeId: 'c1' },
        }),
      ],
    });
    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          idempotencyKey: 'habit_slot:u1:2026-08-29:480',
          payload: {
            destination: 'today',
            challengeId: 'c1',
          },
        }),
      ],
      skipDuplicates: true,
    });
  });

  it('skips challenge reminders for someone who just got a habit slot', async () => {
    const evening = new Date('2026-08-29T19:05:00.000Z');
    const prisma = createPrismaMock({
      zones: ['UTC'],
      reminders: [
        {
          id: 'r1',
          userId: 'u1',
          challengeId: 'c1',
          title: 'Walk',
          frequency: 'daily',
        },
      ],
    });
    const delivery = createDelivery();
    const service = new ReminderDispatcherService(
      prisma as never,
      delivery as never,
      createPolicy() as never,
      createContexts() as never,
    );

    await expect(service.dispatchDue(evening, ['u1'])).resolves.toEqual({
      dueCount: 0,
      sentCount: 0,
      suppressedCount: 0,
    });
    expect(delivery.send).not.toHaveBeenCalled();
  });

  it('does not send a habit slot after the day is finished', async () => {
    const morning = new Date('2026-08-29T08:02:00.000Z');
    const prisma = createPrismaMock({
      profiles: [{ userId: 'u1', timeZone: 'UTC' }],
      enrollments: [{ userId: 'u1', challengeId: 'c1' }],
      completed: [
        { userId: 'u1', challengeId: 'c1', periodKey: '2026-08-29' },
      ],
    });
    const delivery = createDelivery();
    const service = new ReminderDispatcherService(
      prisma as never,
      delivery as never,
      createPolicy() as never,
      createContexts() as never,
    );

    await expect(service.dispatchHabitSlots(morning)).resolves.toEqual({
      dueCount: 0,
      sentCount: 0,
      suppressedCount: 0,
      sentUserIds: [],
    });
    expect(delivery.send).not.toHaveBeenCalled();
  });

  it('skips a reminder already delivered this period', async () => {
    const today = new Date('2026-08-29T19:05:00.000Z');
    const prisma = createPrismaMock({
      zones: ['UTC'],
      reminders: [
        {
          id: 'r1',
          userId: 'u1',
          challengeId: 'c1',
          title: 'Walk',
          frequency: 'daily',
        },
      ],
      delivered: [{ reminderId: 'r1', periodKey: '2026-08-29' }],
    });

    const delivery = createDelivery();
    const service = new ReminderDispatcherService(
      prisma as never,
      delivery as never,
      createPolicy() as never,
      createContexts() as never,
    );

    await expect(service.dispatchDue(today)).resolves.toEqual({
      dueCount: 1,
      sentCount: 0,
      suppressedCount: 0,
    });
    expect(delivery.send).not.toHaveBeenCalled();
  });

  it('treatment skips the 11:00 habit slot', async () => {
    const midMorning = new Date('2026-08-29T11:02:00.000Z');
    const prisma = createPrismaMock({
      profiles: [{ userId: 'u1', timeZone: 'UTC' }],
      enrollments: [{ userId: 'u1', challengeId: 'c1' }],
    });
    const delivery = createDelivery();
    const service = new ReminderDispatcherService(
      prisma as never,
      delivery as never,
      createPolicy({
        plans: new Map([
          [
            'u1',
            treatmentPlan({ localMinute: 11 * 60 + 2, dayKey: '2026-08-29' }),
          ],
        ]),
      }) as never,
      createContexts() as never,
    );

    await expect(service.dispatchHabitSlots(midMorning)).resolves.toEqual({
      dueCount: 1,
      sentCount: 0,
      suppressedCount: 1,
      sentUserIds: [],
    });
    expect(delivery.send).not.toHaveBeenCalled();
  });

  it('holdout still sends the 11:00 habit slot', async () => {
    const midMorning = new Date('2026-08-29T11:02:00.000Z');
    const prisma = createPrismaMock({
      profiles: [{ userId: 'u1', timeZone: 'UTC' }],
      enrollments: [{ userId: 'u1', challengeId: 'c1' }],
    });
    const delivery = createDelivery({ sentCount: 1, usersWithDevice: ['u1'] });
    const service = new ReminderDispatcherService(
      prisma as never,
      delivery as never,
      createPolicy({
        plans: new Map([
          [
            'u1',
            holdoutSafePlan({ localMinute: 11 * 60 + 2, dayKey: '2026-08-29' }),
          ],
        ]),
      }) as never,
      createContexts() as never,
    );

    await expect(service.dispatchHabitSlots(midMorning)).resolves.toMatchObject({
      sentCount: 1,
      sentUserIds: ['u1'],
    });
    expect(delivery.send).toHaveBeenCalled();
  });

  it('treatment suppresses a habit slot when the daily budget is spent', async () => {
    const morning = new Date('2026-08-29T08:02:00.000Z');
    const prisma = createPrismaMock({
      profiles: [{ userId: 'u1', timeZone: 'UTC' }],
      enrollments: [{ userId: 'u1', challengeId: 'c1' }],
    });
    const delivery = createDelivery();
    const service = new ReminderDispatcherService(
      prisma as never,
      delivery as never,
      createPolicy({
        plans: new Map([
          ['u1', treatmentPlan({ remainingBudget: 0 })],
        ]),
      }) as never,
      createContexts() as never,
    );

    await expect(service.dispatchHabitSlots(morning)).resolves.toEqual({
      dueCount: 1,
      sentCount: 0,
      suppressedCount: 1,
      sentUserIds: [],
    });
    expect(delivery.send).not.toHaveBeenCalled();
  });

  it('treatment suppresses clock reminders during quiet hours', async () => {
    const late = new Date('2026-08-29T22:05:00.000Z');
    const prisma = createPrismaMock({
      zones: ['UTC'],
      reminders: [
        {
          id: 'r1',
          userId: 'u1',
          challengeId: 'c1',
          title: 'Walk',
          frequency: 'daily',
        },
      ],
    });
    const delivery = createDelivery();
    const service = new ReminderDispatcherService(
      prisma as never,
      delivery as never,
      createPolicy({
        plans: new Map([
          [
            'u1',
            treatmentPlan({
              quietNow: true,
              localMinute: 22 * 60 + 5,
              remainingBudget: 3,
            }),
          ],
        ]),
      }) as never,
      createContexts() as never,
    );

    await expect(service.dispatchDue(late)).resolves.toEqual({
      dueCount: 1,
      sentCount: 0,
      suppressedCount: 1,
    });
    expect(delivery.send).not.toHaveBeenCalled();
  });

  it('treatment skips a habit slot after recent user_active', async () => {
    const morning = new Date('2026-08-29T08:02:00.000Z');
    const prisma = createPrismaMock({
      profiles: [{ userId: 'u1', timeZone: 'UTC' }],
      enrollments: [{ userId: 'u1', challengeId: 'c1' }],
    });
    const delivery = createDelivery();
    const service = new ReminderDispatcherService(
      prisma as never,
      delivery as never,
      createPolicy({
        plans: new Map([
          ['u1', treatmentPlan({ skipHabitForActivity: true })],
        ]),
      }) as never,
      createContexts() as never,
    );

    await expect(service.dispatchHabitSlots(morning)).resolves.toEqual({
      dueCount: 1,
      sentCount: 0,
      suppressedCount: 1,
      sentUserIds: [],
    });
    expect(delivery.send).not.toHaveBeenCalled();
  });

  it('treatment sets a lead challenge and +N more when several are open', async () => {
    const morning = new Date('2026-08-29T08:02:00.000Z');
    const prisma = createPrismaMock({
      profiles: [{ userId: 'u1', timeZone: 'UTC' }],
      enrollments: [
        { userId: 'u1', challengeId: 'c1' },
        { userId: 'u1', challengeId: 'c2' },
        { userId: 'u1', challengeId: 'c3' },
      ],
    });
    const delivery = createDelivery({ sentCount: 1, usersWithDevice: ['u1'] });
    const policy = createPolicy({
      plans: new Map([['u1', treatmentPlan()]]),
      lead: { leadChallengeId: 'c2', bodySuffix: ' (+2 more)' },
    });
    const contexts = createContexts({
      contexts: new Map([
        [
          'u1:habit_slot:c2:',
          {
            userId: 'u1',
            dayKey: '2026-08-29',
            localMinute: 8 * 60,
            nudgeKind: 'habit_slot',
            firstName: 'Ada',
            streakDays: 0,
            openCount: 3,
            doneCount: 0,
            missedYesterday: false,
            firstWeek: false,
            lead: {
              challengeId: 'c2',
              slug: 'twenty-push-ups',
              title: 'Do 5 push-ups',
              deviceMetric: 'pushups',
              completionKind: 'check_in',
              targetCount: 5,
              measuredCount: null,
              status: 'pending',
            },
            benefitBody: null,
            rivalry: null,
          },
        ],
      ]),
    });
    const service = new ReminderDispatcherService(
      prisma as never,
      delivery as never,
      policy as never,
      contexts as never,
    );

    await expect(service.dispatchHabitSlots(morning)).resolves.toMatchObject({
      sentCount: 1,
      sentUserIds: ['u1'],
    });

    expect(policy.pickLeadForOpenChallenges).toHaveBeenCalled();
    expect(delivery.send).toHaveBeenCalledWith({
      source: 'habit_slot',
      audience: 'all_devices',
      pushes: [
        expect.objectContaining({
          userId: 'u1',
          body: expect.stringMatching(/\(\+2 more\)$/),
          leadChallengeId: 'c2',
          data: { destination: 'today', challengeId: 'c2' },
          templateKey: expect.stringMatching(/^cadence\./),
          situation: 'morning_nothing_done',
          copyVersion: expect.stringMatching(/^v1[ab]$/),
        }),
      ],
    });
  });

  it('treatment sends group copy to the board and spends that group in the inbox', async () => {
    const morning = new Date('2026-08-29T08:02:00.000Z');
    const prisma = createPrismaMock({
      profiles: [{ userId: 'u1', timeZone: 'UTC' }],
      enrollments: [
        { userId: 'u1', challengeId: 'c1' },
        { userId: 'u1', challengeId: 'c2' },
      ],
    });
    const delivery = createDelivery({ sentCount: 1, usersWithDevice: ['u1'] });
    const policy = createPolicy({
      plans: new Map([['u1', treatmentPlan()]]),
      lead: { leadChallengeId: 'c2', bodySuffix: ' (+1 more)' },
    });
    const contexts = createContexts({
      contexts: new Map([
        [
          'u1:habit_slot:c2:',
          {
            userId: 'u1',
            dayKey: '2026-08-29',
            localMinute: 8 * 60,
            nudgeKind: 'habit_slot',
            firstName: 'Bee',
            streakDays: 0,
            openCount: 2,
            doneCount: 0,
            missedYesterday: false,
            firstWeek: false,
            lead: null,
            benefitBody: null,
            rivalry: {
              matchId: 'm1',
              situation: 'group_rival_moved',
              contestTitle: 'Push-up Sunday',
              scoringMode: 'cumulative_total',
              metric: 'pushups',
              rivalName: 'Ada',
              rivalScore: 26,
              yourScore: 20,
              timeLeft: '1 day left',
            },
          },
        ],
      ]),
    });
    const service = new ReminderDispatcherService(
      prisma as never,
      delivery as never,
      policy as never,
      contexts as never,
    );

    await service.dispatchHabitSlots(morning);

    expect(delivery.send).toHaveBeenCalledWith({
      source: 'habit_slot',
      audience: 'all_devices',
      pushes: [
        expect.objectContaining({
          title: 'Ada scored today',
          body: '26 to your 20 · 1 day left',
          data: { matchId: 'm1' },
          templateKey: 'cadence.group_rival_moved',
          situation: 'group_rival_moved',
        }),
      ],
    });
    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ payload: { matchId: 'm1' } })],
      skipDuplicates: true,
    });
  });

  it('holdout habit slots keep the fixed slot copy', async () => {
    const morning = new Date('2026-08-29T08:02:00.000Z');
    const prisma = createPrismaMock({
      profiles: [{ userId: 'u1', timeZone: 'UTC' }],
      enrollments: [{ userId: 'u1', challengeId: 'c1' }],
    });
    const delivery = createDelivery({ sentCount: 1, usersWithDevice: ['u1'] });
    const contexts = createContexts();
    const service = new ReminderDispatcherService(
      prisma as never,
      delivery as never,
      createPolicy({
        plans: new Map([['u1', holdoutSafePlan()]]),
      }) as never,
      contexts as never,
    );

    await service.dispatchHabitSlots(morning);

    expect(contexts.loadMany).not.toHaveBeenCalled();
    expect(delivery.send).toHaveBeenCalledWith({
      source: 'habit_slot',
      audience: 'all_devices',
      pushes: [
        expect.objectContaining({
          title: "Start today's challenge",
          body: "Today's on you",
        }),
      ],
    });
  });

  it('treatment in-progress uses awaiting_evidence copy', async () => {
    const now = new Date('2026-08-29T12:00:00.000Z');
    const prisma = createPrismaMock({
      inProgress: [
        {
          id: 'uc1',
          userId: 'u1',
          challengeId: 'c1',
          periodKey: '2026-08-29',
          startedAt: new Date('2026-08-29T11:00:00.000Z'),
        },
      ],
    });
    const delivery = createDelivery({ sentCount: 1, usersWithDevice: ['u1'] });
    const service = new ReminderDispatcherService(
      prisma as never,
      delivery as never,
      createPolicy({
        plans: new Map([
          ['u1', treatmentPlan({ localMinute: 12 * 60, dayKey: '2026-08-29' })],
        ]),
      }) as never,
      createContexts({
        contexts: new Map([
          [
            'u1:in_progress_nudge:c1:uc1',
            {
              userId: 'u1',
              dayKey: '2026-08-29',
              localMinute: 12 * 60,
              nudgeKind: 'in_progress_nudge',
              firstName: null,
              streakDays: 0,
              openCount: 1,
              doneCount: 0,
              missedYesterday: false,
              firstWeek: false,
              lead: {
                challengeId: 'c1',
                slug: 'gym-session',
                title: 'Gym',
                deviceMetric: null,
                completionKind: 'evidence_photo',
                targetCount: null,
                measuredCount: null,
                status: 'awaiting_evidence',
              },
              benefitBody: null,
              rivalry: null,
            },
          ],
        ]),
      }) as never,
    );

    await expect(service.dispatchInProgressNudges(now)).resolves.toMatchObject({
      sentCount: 1,
    });
    expect(delivery.send).toHaveBeenCalledWith({
      source: 'in_progress_nudge',
      audience: 'all_devices',
      pushes: [
        expect.objectContaining({
          situation: 'awaiting_evidence',
          body: expect.stringMatching(/photo/i),
          templateKey: 'cadence.awaiting_evidence',
        }),
      ],
    });
  });

  it('treatment suppresses in-progress nudges when the budget is spent', async () => {
    const now = new Date('2026-08-29T12:00:00.000Z');
    const prisma = createPrismaMock({
      inProgress: [
        {
          id: 'uc1',
          userId: 'u1',
          challengeId: 'c1',
          periodKey: '2026-08-29',
          startedAt: new Date('2026-08-29T11:00:00.000Z'),
        },
      ],
    });
    const delivery = createDelivery();
    const service = new ReminderDispatcherService(
      prisma as never,
      delivery as never,
      createPolicy({
        plans: new Map([['u1', treatmentPlan({ remainingBudget: 0 })]]),
      }) as never,
      createContexts() as never,
    );

    await expect(service.dispatchInProgressNudges(now)).resolves.toEqual({
      dueCount: 1,
      sentCount: 0,
      suppressedCount: 1,
    });
    expect(delivery.send).not.toHaveBeenCalled();
  });
});
