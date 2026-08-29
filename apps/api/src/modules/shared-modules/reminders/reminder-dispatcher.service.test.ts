import { describe, expect, it, vi } from 'vitest';
import { ReminderDispatcherService } from './reminder-dispatcher.service.js';

function createPrismaMock(options: {
  zones?: string[];
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
  tokens?: Array<{ userId: string; expoPushToken: string }>;
}) {
  return {
    userProfile: {
      findMany: vi.fn().mockResolvedValue(
        (options.zones ?? []).map((timeZone) => ({ timeZone })),
      ),
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
      findMany: vi.fn().mockResolvedValue(options.completed ?? []),
    },
    pushDevice: {
      findMany: vi.fn().mockResolvedValue(options.tokens ?? []),
    },
    notification: {
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  };
}

function createPushSender(sentCount = 1) {
  return {
    send: vi.fn().mockResolvedValue({ sentCount, rejectedTokens: [] }),
  };
}

function createPushDevices() {
  return { deactivateTokens: vi.fn().mockResolvedValue(undefined) };
}

describe('ReminderDispatcherService', () => {
  it('returns zeros when nobody has reminders enabled', async () => {
    const service = new ReminderDispatcherService(
      createPrismaMock({}) as never,
      createPushSender() as never,
      createPushDevices() as never,
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

    // 16:00 UTC is minute 960; a 7pm reminder is not due. Use a 4pm reminder.
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

    const push = createPushSender();
    const service = new ReminderDispatcherService(
      prisma as never,
      push as never,
      createPushDevices() as never,
    );

    await expect(service.dispatchDue(today)).resolves.toEqual({
      dueCount: 1,
      sentCount: 0,
      suppressedCount: 1,
    });
    expect(push.send).not.toHaveBeenCalled();
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
      tokens: [{ userId: 'u1', expoPushToken: 'ExponentPushToken[abc]' }],
    });

    const push = createPushSender(1);
    const devices = createPushDevices();
    const service = new ReminderDispatcherService(
      prisma as never,
      push as never,
      devices as never,
    );

    await expect(service.dispatchDue(today)).resolves.toEqual({
      dueCount: 1,
      sentCount: 1,
      suppressedCount: 0,
    });

    expect(push.send).toHaveBeenCalled();
    expect(prisma.reminderDelivery.createMany).toHaveBeenCalledWith({
      data: [{ reminderId: 'r1', periodKey: '2026-08-29' }],
      skipDuplicates: true,
    });
    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: 'u1',
          kind: 'reminder',
          title: 'Walk',
          body: 'A few minutes now keeps your streak alive.',
          idempotencyKey: 'reminder:r1:2026-08-29',
        },
      ],
      skipDuplicates: true,
    });
    expect(devices.deactivateTokens).toHaveBeenCalledWith([]);
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

    const push = createPushSender();
    const service = new ReminderDispatcherService(
      prisma as never,
      push as never,
      createPushDevices() as never,
    );

    await expect(service.dispatchDue(today)).resolves.toEqual({
      dueCount: 1,
      sentCount: 0,
      suppressedCount: 0,
    });
    expect(push.send).not.toHaveBeenCalled();
  });
});
