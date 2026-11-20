import { describe, expect, it, vi } from 'vitest';
import { InviteAcceptedNotifierService } from './invite-accepted-notifier.service.js';

const notice = {
  matchId: 'm1',
  hostUserId: 'host',
  acceptedUserId: 'guest',
  acceptedDisplayName: 'Bee',
};

function createPrismaMock() {
  return {
    notification: {
      findUnique: vi.fn().mockResolvedValue(null),
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };
}

function createDelivery() {
  return {
    send: vi.fn().mockResolvedValue({
      sentCount: 1,
      messageCount: 1,
      usersWithDevice: ['host'],
      usersWithoutDevice: [],
    }),
  };
}

function createService(
  prisma: ReturnType<typeof createPrismaMock>,
  delivery = createDelivery(),
) {
  const service = new InviteAcceptedNotifierService(
    prisma as never,
    delivery as never,
  );

  return { service, delivery };
}

describe('InviteAcceptedNotifierService', () => {
  it('tells the host, by name, that the invite was accepted', async () => {
    const prisma = createPrismaMock();
    const { service, delivery } = createService(prisma);

    await service.notifyHost(notice);

    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: 'host',
          kind: 'social',
          title: 'See who joined',
          body: 'Bee accepted your challenge.',
          payload: { matchId: 'm1' },
          idempotencyKey: 'invite_accepted:m1:guest',
        },
      ],
      skipDuplicates: true,
    });
    expect(delivery.send).toHaveBeenCalledWith({
      source: 'invite_accepted',
      audience: 'group_opt_in',
      pushes: [
        {
          userId: 'host',
          title: 'See who joined',
          body: 'Bee accepted your challenge.',
          data: { matchId: 'm1' },
        },
      ],
    });
  });

  it('does not notify the host about their own seat', async () => {
    const prisma = createPrismaMock();
    const { service, delivery } = createService(prisma);

    await service.notifyHost({ ...notice, acceptedUserId: 'host' });

    expect(prisma.notification.createMany).not.toHaveBeenCalled();
    expect(delivery.send).not.toHaveBeenCalled();
  });

  it('is idempotent, so opening the contest again does not ping twice', async () => {
    const prisma = createPrismaMock();
    prisma.notification.findUnique.mockResolvedValue({ id: 'n1' });
    const { service, delivery } = createService(prisma);

    await service.notifyHost(notice);

    expect(prisma.notification.createMany).not.toHaveBeenCalled();
    expect(delivery.send).not.toHaveBeenCalled();
  });

  it('keeps the inbox row even when delivery finds no device', async () => {
    const prisma = createPrismaMock();
    const delivery = createDelivery();
    delivery.send.mockResolvedValue({
      sentCount: 0,
      messageCount: 0,
      usersWithDevice: [],
      usersWithoutDevice: ['host'],
    });
    const { service } = createService(prisma, delivery);

    await service.notifyHost(notice);

    expect(prisma.notification.createMany).toHaveBeenCalled();
    expect(delivery.send).toHaveBeenCalled();
  });
});
