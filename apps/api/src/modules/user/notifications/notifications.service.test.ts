import { describe, expect, it, vi } from 'vitest';
import { ORPCError } from '@orpc/server';
import { NotificationsService } from './notifications.service.js';

const user = { id: 'u1', email: 'a@b.co', name: 'Ada' };

function createPrismaMock(rows: Array<{
  id: string;
  kind: 'reminder' | 'success';
  title: string;
  body: string;
  readAt: Date | null;
  createdAt: Date;
}> = []) {
  return {
    notification: {
      findMany: vi.fn().mockResolvedValue(rows),
      count: vi
        .fn()
        .mockResolvedValue(rows.filter((row) => row.readAt === null).length),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
  };
}

describe('NotificationsService', () => {
  it('rejects unauthenticated callers', async () => {
    const service = new NotificationsService(createPrismaMock() as never);

    await expect(service.listInbox(null)).rejects.toBeInstanceOf(ORPCError);
  });

  it('maps unread rows and reports the unread count', async () => {
    const createdAt = new Date('2026-08-29T10:00:00.000Z');
    const service = new NotificationsService(
      createPrismaMock([
        {
          id: 'n1',
          kind: 'success',
          title: 'Challenge completed',
          body: 'You earned 20 points.',
          readAt: null,
          createdAt,
        },
        {
          id: 'n2',
          kind: 'reminder',
          title: 'Time for a walk',
          body: 'Your daily challenge is waiting.',
          readAt: new Date('2026-08-29T09:00:00.000Z'),
          createdAt,
        },
      ]) as never,
    );

    await expect(service.listInbox(user)).resolves.toEqual({
      notifications: [
        {
          id: 'n1',
          kind: 'success',
          title: 'Challenge completed',
          body: 'You earned 20 points.',
          isRead: false,
          createdAt: createdAt.toISOString(),
        },
        {
          id: 'n2',
          kind: 'reminder',
          title: 'Time for a walk',
          body: 'Your daily challenge is waiting.',
          isRead: true,
          createdAt: createdAt.toISOString(),
        },
      ],
      unreadCount: 1,
    });
  });

  it('marks every unread row for the caller', async () => {
    const prisma = createPrismaMock();
    const service = new NotificationsService(prisma as never);

    await expect(service.markAllRead(user)).resolves.toEqual({
      unreadCount: 0,
    });

    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', readAt: null },
      data: { readAt: expect.any(Date) },
    });
  });
});
