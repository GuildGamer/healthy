import { describe, expect, it, vi } from 'vitest';
import { AdminNotificationsService } from './admin-notifications.service.js';

const admin = {
  id: 'admin-1',
  email: 'support@example.com',
  name: 'Support',
  roles: ['support' as const],
  isActive: true,
};

function createPrisma(options?: {
  users?: Array<{ id: string; email: string }>;
  audits?: Array<{ payload: unknown }>;
}) {
  return {
    adminAuditEvent: {
      findMany: vi.fn().mockResolvedValue(options?.audits ?? []),
      create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
    },
    challenge: {
      findUnique: vi.fn().mockResolvedValue({ id: 'c1' }),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue(options?.users?.[0] ?? null),
      findMany: vi.fn().mockResolvedValue(options?.users ?? []),
    },
    notification: {
      createMany: vi.fn().mockResolvedValue({
        count: options?.users?.length ?? 0,
      }),
    },
  };
}

function createDelivery(options?: {
  sentCount?: number;
  usersWithDevice?: string[];
  usersWithoutDevice?: string[];
}) {
  return {
    send: vi.fn().mockResolvedValue({
      sentCount: options?.sentCount ?? 1,
      messageCount: options?.sentCount ?? 1,
      usersWithDevice: options?.usersWithDevice ?? ['u1'],
      usersWithoutDevice: options?.usersWithoutDevice ?? [],
    }),
  };
}

describe('AdminNotificationsService', () => {
  it('sends push, email, and inbox for members with reminders on', async () => {
    const prisma = createPrisma({
      users: [{ id: 'u1', email: 'ada@example.com' }],
    });
    const delivery = createDelivery();
    const mailer = { sendMessage: vi.fn().mockResolvedValue(undefined) };
    const service = new AdminNotificationsService(
      prisma as never,
      mailer as never,
      delivery as never,
    );

    await expect(
      service.send(admin, {
        idempotencyKey: 'broadcast-1',
        title: 'Do one now',
        body: 'Got a few minutes?',
        sendPush: true,
        sendEmail: true,
        sendInbox: true,
        audience: 'reminders_on',
        destination: 'today',
      }),
    ).resolves.toEqual({
      audienceCount: 1,
      pushSentCount: 1,
      emailSentCount: 1,
      inboxWrittenCount: 1,
      skippedNoDeviceCount: 0,
      replayed: false,
    });

    expect(delivery.send).toHaveBeenCalledWith({
      source: 'admin_broadcast',
      audience: 'all_devices',
      pushes: [
        {
          userId: 'u1',
          title: 'Do one now',
          body: 'Got a few minutes?',
          data: { destination: 'today' },
        },
      ],
    });
    expect(mailer.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'ada@example.com',
        subject: 'Do one now',
        text: expect.stringContaining('Got a few minutes?'),
        html: expect.stringContaining('Healthy'),
      }),
    );
    expect(prisma.adminAuditEvent.create).toHaveBeenCalled();
  });

  it('returns the prior result when the same idempotency key is reused', async () => {
    const prisma = createPrisma({
      audits: [
        {
          payload: {
            idempotencyKey: 'broadcast-1',
            result: {
              audienceCount: 2,
              pushSentCount: 1,
              emailSentCount: 2,
              inboxWrittenCount: 2,
              skippedNoDeviceCount: 1,
            },
          },
        },
      ],
    });
    const delivery = createDelivery();
    const mailer = { sendMessage: vi.fn() };
    const service = new AdminNotificationsService(
      prisma as never,
      mailer as never,
      delivery as never,
    );

    await expect(
      service.send(admin, {
        idempotencyKey: 'broadcast-1',
        title: 'Do one now',
        body: 'Got a few minutes?',
        sendPush: true,
        sendEmail: true,
        sendInbox: true,
        audience: 'reminders_on',
        destination: 'today',
      }),
    ).resolves.toEqual({
      audienceCount: 2,
      pushSentCount: 1,
      emailSentCount: 2,
      inboxWrittenCount: 2,
      skippedNoDeviceCount: 1,
      replayed: true,
    });

    expect(delivery.send).not.toHaveBeenCalled();
    expect(mailer.sendMessage).not.toHaveBeenCalled();
  });

  it('counts members without a device as skipped', async () => {
    const prisma = createPrisma({
      users: [
        { id: 'u1', email: 'ada@example.com' },
        { id: 'u2', email: 'bee@example.com' },
      ],
    });
    const delivery = createDelivery({
      sentCount: 1,
      usersWithDevice: ['u1'],
      usersWithoutDevice: ['u2'],
    });
    const mailer = { sendMessage: vi.fn().mockResolvedValue(undefined) };
    const service = new AdminNotificationsService(
      prisma as never,
      mailer as never,
      delivery as never,
    );

    await expect(
      service.send(admin, {
        idempotencyKey: 'broadcast-2',
        title: 'Do one now',
        body: 'Got a few minutes?',
        sendPush: true,
        sendEmail: false,
        sendInbox: false,
        audience: 'reminders_on',
        destination: 'today',
      }),
    ).resolves.toEqual({
      audienceCount: 2,
      pushSentCount: 1,
      emailSentCount: 0,
      inboxWrittenCount: 0,
      skippedNoDeviceCount: 1,
      replayed: false,
    });
  });
});
