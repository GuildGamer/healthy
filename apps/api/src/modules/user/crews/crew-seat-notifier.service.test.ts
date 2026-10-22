import { describe, expect, it, vi } from 'vitest';
import { PushDevicesService } from '../../shared-modules/push/push-devices.service.js';
import { CrewSeatNotifierService } from './crew-seat-notifier.service.js';

function createPrismaMock() {
  return {
    notification: {
      findMany: vi.fn().mockResolvedValue([]),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    pushDevice: {
      findMany: vi
        .fn()
        .mockResolvedValue([{ expoPushToken: 'ExponentPushToken[bee]' }]),
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
  const pushDevices = new PushDevicesService(prisma as never);
  vi.spyOn(pushDevices, 'deactivateTokens').mockResolvedValue(undefined);
  const service = new CrewSeatNotifierService(
    prisma as never,
    pushSender,
    pushDevices as never,
  );

  return { service, pushSender, pushDevices };
}

describe('CrewSeatNotifierService', () => {
  it('writes one inbox row per seat and pushes to their devices', async () => {
    const prisma = createPrismaMock();
    const { service, pushSender } = createService(prisma);

    await service.notifySeated('m1', ['bee', 'cam']);

    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          userId: 'bee',
          kind: 'social',
          payload: { matchId: 'm1' },
          idempotencyKey: 'crew_seat:m1:bee',
        }),
        expect.objectContaining({
          userId: 'cam',
          payload: { matchId: 'm1' },
          idempotencyKey: 'crew_seat:m1:cam',
        }),
      ],
      skipDuplicates: true,
    });
    expect(pushSender.send).toHaveBeenCalled();
  });

  it('does not name the host or the crew in what it sends', async () => {
    const prisma = createPrismaMock();
    const { service, pushSender } = createService(prisma);

    await service.notifySeated('m1', ['bee']);

    const [messages] = pushSender.send.mock.calls[0] as [
      { title: string; body: string }[],
    ];
    const text = `${messages[0]?.title} ${messages[0]?.body}`;
    expect(text).not.toMatch(/Ada|crew/i);
    expect(text).toMatch(/group challenge/i);
  });

  it('is idempotent, so a retried creation cannot notify twice', async () => {
    const prisma = createPrismaMock();
    prisma.notification.findMany.mockResolvedValue([
      { idempotencyKey: 'crew_seat:m1:bee' },
    ]);
    const { service, pushSender } = createService(prisma);

    await service.notifySeated('m1', ['bee', 'cam']);

    // Bee already knows; only Cam is new.
    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ userId: 'cam' })],
      skipDuplicates: true,
    });
    expect(prisma.pushDevice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: { in: ['cam'] } }),
      }),
    );
    expect(pushSender.send).toHaveBeenCalledTimes(1);
  });

  it('does nothing at all when everyone has already been told', async () => {
    const prisma = createPrismaMock();
    prisma.notification.findMany.mockResolvedValue([
      { idempotencyKey: 'crew_seat:m1:bee' },
    ]);
    const { service, pushSender } = createService(prisma);

    await service.notifySeated('m1', ['bee']);

    expect(prisma.notification.createMany).not.toHaveBeenCalled();
    expect(pushSender.send).not.toHaveBeenCalled();
  });

  it('skips the push but keeps the inbox row when there is no device', async () => {
    const prisma = createPrismaMock();
    prisma.pushDevice.findMany.mockResolvedValue([]);
    const { service, pushSender } = createService(prisma);

    await service.notifySeated('m1', ['bee']);

    expect(prisma.notification.createMany).toHaveBeenCalled();
    expect(pushSender.send).not.toHaveBeenCalled();
  });

  it('retires tokens the provider rejected', async () => {
    const prisma = createPrismaMock();
    const pushSender = {
      send: vi.fn().mockResolvedValue({
        sentCount: 0,
        rejectedTokens: ['ExponentPushToken[bee]'],
      }),
    };
    const { service, pushDevices } = createService(prisma, pushSender);

    await service.notifySeated('m1', ['bee']);

    expect(pushDevices.deactivateTokens).toHaveBeenCalledWith([
      'ExponentPushToken[bee]',
    ]);
  });

  it('stays quiet when a contest seats nobody', async () => {
    const prisma = createPrismaMock();
    const { service } = createService(prisma);

    await service.notifySeated('m1', []);

    expect(prisma.notification.findMany).not.toHaveBeenCalled();
    expect(prisma.notification.createMany).not.toHaveBeenCalled();
  });
});
