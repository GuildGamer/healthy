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
  devices?: Array<{ userId: string; expoPushToken: string }>;
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
    pushDevice: {
      findMany: vi.fn().mockResolvedValue(options?.devices ?? []),
    },
    notification: {
      createMany: vi.fn().mockResolvedValue({
        count: options?.users?.length ?? 0,
      }),
    },
  };
}

describe('AdminNotificationsService', () => {
  it('sends push, email, and inbox for members with reminders on', async () => {
    const prisma = createPrisma({
      users: [{ id: 'u1', email: 'ada@example.com' }],
      devices: [{ userId: 'u1', expoPushToken: 'ExponentPushToken[abc]' }],
    });
    const pushSender = {
      send: vi.fn().mockResolvedValue({ sentCount: 1, rejectedTokens: [] }),
    };
    const mailer = { sendMessage: vi.fn().mockResolvedValue(undefined) };
    const pushDevices = { deactivateTokens: vi.fn() };
    const service = new AdminNotificationsService(
      prisma as never,
      pushSender as never,
      mailer as never,
      pushDevices as never,
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

    expect(pushSender.send).toHaveBeenCalledWith([
      expect.objectContaining({
        title: 'Do one now',
        data: { destination: 'today' },
      }),
    ]);
    expect(mailer.sendMessage).toHaveBeenCalledWith({
      to: 'ada@example.com',
      subject: 'Do one now',
      text: 'Got a few minutes?',
    });
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
    const pushSender = { send: vi.fn() };
    const mailer = { sendMessage: vi.fn() };
    const service = new AdminNotificationsService(
      prisma as never,
      pushSender as never,
      mailer as never,
      { deactivateTokens: vi.fn() } as never,
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

    expect(pushSender.send).not.toHaveBeenCalled();
    expect(mailer.sendMessage).not.toHaveBeenCalled();
  });
});
