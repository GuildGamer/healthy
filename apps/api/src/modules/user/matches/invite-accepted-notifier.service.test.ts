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
    pushDevice: {
      findMany: vi.fn().mockResolvedValue([{ expoPushToken: 'ExponentPushToken[host]' }]),
    },
  };
}

function createPushSender() {
  return {
    send: vi.fn().mockResolvedValue({ sentCount: 1, rejectedTokens: [] }),
  };
}

function createService(
  prisma: ReturnType<typeof createPrismaMock>,
  pushSender = createPushSender(),
) {
  const pushDevices = { deactivateTokens: vi.fn() };
  const service = new InviteAcceptedNotifierService(
    prisma as never,
    pushSender,
    pushDevices as never,
  );

  return { service, pushSender, pushDevices };
}

describe('InviteAcceptedNotifierService', () => {
  it('tells the host, by name, that the invite was accepted', async () => {
    const prisma = createPrismaMock();
    const { service, pushSender } = createService(prisma);

    await service.notifyHost(notice);

    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: 'host',
          kind: 'social',
          title: 'See who joined',
          body: 'Bee accepted your challenge.',
          idempotencyKey: 'invite_accepted:m1:guest',
        },
      ],
      skipDuplicates: true,
    });
    expect(pushSender.send).toHaveBeenCalledWith([
      {
        expoPushToken: 'ExponentPushToken[host]',
        title: 'See who joined',
        body: 'Bee accepted your challenge.',
        data: { matchId: 'm1' },
      },
    ]);
  });

  it('does not notify the host about their own seat', async () => {
    const prisma = createPrismaMock();
    const { service, pushSender } = createService(prisma);

    await service.notifyHost({ ...notice, acceptedUserId: 'host' });

    expect(prisma.notification.createMany).not.toHaveBeenCalled();
    expect(pushSender.send).not.toHaveBeenCalled();
  });

  it('is idempotent, so opening the contest again does not ping twice', async () => {
    const prisma = createPrismaMock();
    prisma.notification.findUnique.mockResolvedValue({ id: 'n1' });
    const { service, pushSender } = createService(prisma);

    await service.notifyHost(notice);

    expect(prisma.notification.createMany).not.toHaveBeenCalled();
    expect(pushSender.send).not.toHaveBeenCalled();
  });

  it('keeps the inbox row when the host has no device', async () => {
    const prisma = createPrismaMock();
    prisma.pushDevice.findMany.mockResolvedValue([]);
    const { service, pushSender } = createService(prisma);

    await service.notifyHost(notice);

    expect(prisma.notification.createMany).toHaveBeenCalled();
    expect(pushSender.send).not.toHaveBeenCalled();
  });

  it('retires tokens the provider rejected', async () => {
    const prisma = createPrismaMock();
    const pushSender = {
      send: vi.fn().mockResolvedValue({
        sentCount: 0,
        rejectedTokens: ['ExponentPushToken[host]'],
      }),
    };
    const { service, pushDevices } = createService(prisma, pushSender);

    await service.notifyHost(notice);

    expect(pushDevices.deactivateTokens).toHaveBeenCalledWith(['ExponentPushToken[host]']);
  });
});
